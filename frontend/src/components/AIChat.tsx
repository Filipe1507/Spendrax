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

export default function AIChat({ categories, onTransactionAdded }: AIChatProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ParsedTransaction | null>(null)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const parseWithAI = async (text: string): Promise<ParsedTransaction> => {
    const res = await api.post('/ai/parse', { text })
    return res.data
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setConfirmed(false)

    try {
      const parsed = await parseWithAI(input)
      setResult(parsed)
    } catch (err: any) {
      const status = err.response?.status
      if (status === 429) {
        setError(err.response.data.detail)
      } else if (status === 504) {
        setError('O serviço de IA demorou demasiado. Tenta outra vez.')
      } else {
        setError('Não consegui interpretar. Tenta ser mais específico, ex: "almoço 12€" ou "salário 800 euros todo o mês"')
      }
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

          {/* Toggle recorrente */}
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