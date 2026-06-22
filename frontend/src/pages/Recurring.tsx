import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

interface Transaction {
  id: number
  amount: number
  description: string
  date: string
  type: 'income' | 'expense'
  is_recurring: boolean
  category: { name: string; icon: string } | null
  category_id: number | null
}

export default function Recurring() {
  const navigate = useNavigate()
  const now = new Date()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState<number[]>([])

  const fetchRecurring = async () => {
    try {
      const [recurringRes, thisMonthRes] = await Promise.all([
        api.get('/transactions/list/recurring'),
        api.get(`/transactions/?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
      ])

      setTransactions(recurringRes.data)

      // Marca como adicionadas as que já têm transação este mês com a mesma descrição
      const thisMonthDescriptions = thisMonthRes.data.map((t: any) => t.description.toLowerCase())
      const alreadyAdded = recurringRes.data
        .filter((t: Transaction) => thisMonthDescriptions.includes(t.description.toLowerCase()))
        .map((t: Transaction) => t.id)
      setAdded(alreadyAdded)
    } catch (err) {
      console.error('Erro:', err)
      navigate('/login')
    }
  }

  useEffect(() => { fetchRecurring() }, [])

  const handleAddThisMonth = async (t: Transaction) => {
    setLoading(true)
    try {
      await api.post('/transactions/', {
        description: t.description,
        amount: t.amount,
        type: t.type,
        category_id: t.category_id,
        date: new Date().toISOString(),
        is_recurring: false,
      })
      setAdded(prev => [...prev, t.id])
    } catch {
      alert('Erro ao adicionar transação')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAll = async () => {
    setLoading(true)
    const notAdded = transactions.filter(t => !added.includes(t.id))
    for (const t of notAdded) {
      try {
        await api.post('/transactions/', {
          description: t.description,
          amount: t.amount,
          type: t.type,
          category_id: t.category_id,
          date: new Date().toISOString(),
          is_recurring: false,
        })
        setAdded(prev => [...prev, t.id])
      } catch {
        console.error('Erro ao adicionar', t.description)
      }
    }
    setLoading(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Apagar esta transação recorrente? Isto remove-a da lista de recorrentes permanentemente.')) return
    await api.delete(`/transactions/${id}`)
    fetchRecurring()
  }

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const allAdded = transactions.length > 0 && added.length === transactions.length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto p-6">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Recorrentes 🔄</h1>
            <p className="text-gray-400 text-sm mt-1">
              Despesas e receitas fixas mensais
            </p>
          </div>
          {transactions.length > 0 && !allAdded && (
            <button
              onClick={handleAddAll}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm"
            >
              + Adicionar todas em {now.toLocaleString('pt-PT', { month: 'long' })}
            </button>
          )}
          {allAdded && (
            <span className="text-emerald-400 text-sm font-medium">
              ✓ Todas adicionadas em {now.toLocaleString('pt-PT', { month: 'long' })}
            </span>
          )}
        </div>

        {/* Resumo */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Total recorrentes</p>
              <p className="text-xl font-bold">{transactions.length}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Despesas fixas</p>
              <p className="text-xl font-bold text-red-400">-{totalExpenses.toFixed(2)}€</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Receitas fixas</p>
              <p className="text-xl font-bold text-emerald-400">+{totalIncome.toFixed(2)}€</p>
            </div>
          </div>
        )}

        {/* Como adicionar */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-6">
          <p className="text-sm text-gray-400">
            💡 Para adicionar transações recorrentes, usa o chatbot IA no Dashboard e diz algo como:
          </p>
          <div className="flex gap-2 flex-wrap mt-3">
            {[
              '"Netflix 17€ todo o mês"',
              '"salário 1000€ mensalmente"',
              '"ginásio 40€ cada mês"',
              '"renda 500€ mensal"',
            ].map(ex => (
              <span key={ex} className="text-xs bg-gray-800 text-emerald-400 px-3 py-1 rounded-full">
                {ex}
              </span>
            ))}
          </div>
        </div>

        {/* Lista */}
        {transactions.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center text-gray-500">
            Ainda não tens transações recorrentes. Usa o chatbot IA no Dashboard para adicionar! 👆
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <h2 className="font-semibold">
                {now.toLocaleString('pt-PT', { month: 'long', year: 'numeric' })} — {added.length}/{transactions.length} adicionadas
              </h2>
            </div>
            <div className="divide-y divide-gray-800">
              {transactions.map(t => {
                const isAdded = added.includes(t.id)
                return (
                  <div key={t.id} className={`flex items-center justify-between p-4 transition-colors ${isAdded ? 'opacity-60' : 'hover:bg-gray-800'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{t.category?.icon || '💰'}</span>
                      <div>
                        <p className="font-medium">{t.description}</p>
                        <p className="text-sm text-gray-400">
                          {t.category?.name || 'Sem categoria'} · Recorrente mensal
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)}€
                      </span>
                      {isAdded ? (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-medium">
                          ✓ Adicionada
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddThisMonth(t)}
                          disabled={loading}
                          className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded-full transition-colors"
                        >
                          + Este mês
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                        title="Remover dos recorrentes"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}