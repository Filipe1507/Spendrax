import { useState } from 'react'
import api from '../api/axios'

interface Category {
  id: number
  name: string
  icon: string
}

interface AIChatProps {
  categories: Category[]
  onTransactionAdded: () => void
}

interface ParsedTransaction {
  description: string
  amount: number
  type: 'expense' | 'income'
  category_name: string
  is_recurring: boolean
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export default function AIChat({ categories, onTransactionAdded }: AIChatProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ParsedTransaction | null>(null)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const parseWithGroq = async (text: string): Promise<ParsedTransaction> => {
    const categoryNames = categories.map(c => c.name).join(', ')

    const prompt = `Analisa este texto e extrai informação de uma transação financeira.
Texto: "${text}"

Categorias disponíveis: ${categoryNames}

Responde APENAS com um JSON válido, sem texto extra, sem markdown, sem backticks:
{
  "description": "descrição curta da transação",
  "amount": valor_numerico_positivo,
  "type": "expense" ou "income",
  "category_name": "uma das categorias disponíveis ou a mais próxima",
  "is_recurring": true ou false
}

Regras:
- type é "income" se for salário, receita, ganho, reembolso
- type é "expense" para tudo o resto
- amount é sempre positivo
- description deve ser clara e curta
- category_name deve ser exatamente uma das categorias disponíveis
- is_recurring é APENAS true se o texto mencionar EXPLICITAMENTE "todos os meses", "mensalmente", "todo o mês", "sempre", "fixo mensal", "mensal", "recorrente", "cada mês". Se não mencionar nada disso, is_recurring é SEMPRE false.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      })
    })

    const data = await response.json()
    const rawText = data.choices[0].message.content.trim()
    const cleaned = rawText.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setConfirmed(false)

    try {
      const parsed = await parseWithGroq(input)
      setResult(parsed)
    } catch {
      setError('Não consegui interpretar. Tenta ser mais específico, ex: "almoço 12€" ou "salário 800 euros todo o mês"')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!result) return
    setLoading(true)
    try {
      const category = categories.find(c => c.name === result.category_name)
      await api.post('/transactions/', {
        description: result.description,
        amount: result.amount,
        type: result.type,
        category_id: category?.id || null,
        date: new Date().toISOString(),
        is_recurring: result.is_recurring,
      })
      setConfirmed(true)
      setInput('')
      setResult(null)
      onTransactionAdded()
    } catch {
      setError('Erro ao guardar a transação')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (field: keyof ParsedTransaction, value: string | number | boolean) => {
    if (!result) return
    setResult({ ...result, [field]: value })
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-emerald-500/30 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🤖</span>
        <h2 className="font-semibold text-lg">Adicionar com IA</h2>
        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Groq AI</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-4">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none"
          placeholder='Ex: "Netflix 17€ todo o mês", "recebi salário 800€"'
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
        >
          {loading ? '...' : '✨'}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {confirmed && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-3">
          <p className="text-emerald-400 text-sm">✓ Transação adicionada com sucesso!</p>
        </div>
      )}

      {result && !confirmed && (
        <div className="bg-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-400 mb-3">Confirma ou edita antes de guardar:</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descrição: </label>
              <input
                type="text"
                value={result.description}
                onChange={e => handleEdit('description', e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Valor (€): </label>
              <input
                type="number"
                step="0.01"
                value={result.amount}
                onChange={e => handleEdit('amount', parseFloat(e.target.value))}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo: </label>
              <select
                value={result.type}
                onChange={e => handleEdit('type', e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-emerald-500 focus:outline-none"
              >
                <option value="expense">💸 Despesa</option>
                <option value="income">💵 Receita</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Categoria: </label>
              <select
                value={result.category_name}
                onChange={e => handleEdit('category_name', e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-emerald-500 focus:outline-none"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
          </div>

           {/* Toggle recorrente — só aparece se a IA detetou como recorrente, ou o utilizador pode ativar */}
        <div className="flex items-center justify-between bg-gray-700 rounded-lg px-3 py-2">
          <div>
            <p className="text-sm font-medium">
              {result.is_recurring ? '🔄 Transação recorrente' : 'Marcar como recorrente?'}
            </p>
            <p className="text-xs text-gray-400">
              {result.is_recurring ? 'Repete todos os meses' : 'Ativa se se repetir mensalmente'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleEdit('is_recurring', !result.is_recurring)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              result.is_recurring ? 'bg-emerald-500' : 'bg-gray-600'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
              result.is_recurring ? 'left-6' : 'left-0.5'
            }`} />
          </button>
        </div>

        {result.is_recurring && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            <p className="text-xs text-emerald-400">
              🔄 Ficará disponível na página de Recorrentes para adicionar automaticamente todos os meses.
            </p>
          </div>
        )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
            >
              {loading ? 'A guardar...' : '✓ Confirmar'}
            </button>
            <button
              onClick={() => { setResult(null); setInput('') }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg transition-colors text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}