import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

interface Category {
  id: number
  name: string
  icon: string
}

interface Budget {
  id: number
  amount_limit: number
  month: number
  year: number
  category: { name: string; icon: string }
}

interface Transaction {
  amount: number
  type: string
  category: { name: string } | null
}

export default function Budgets() {
  const navigate = useNavigate()
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category_id: '', amount_limit: '' })

  const fetchData = async () => {
    try {
      const [budgetsRes, categoriesRes, transactionsRes] = await Promise.all([
        api.get(`/budgets/?month=${month}&year=${year}`),
        api.get('/categories/'),
        api.get(`/transactions/?month=${month}&year=${year}`),
      ])
      setBudgets(budgetsRes.data)
      setCategories(categoriesRes.data)
      setTransactions(transactionsRes.data)
    } catch {
      navigate('/login')
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/budgets/', {
        category_id: parseInt(form.category_id),
        amount_limit: parseFloat(form.amount_limit),
        month,
        year,
      })
      setShowForm(false)
      setForm({ category_id: '', amount_limit: '' })
      fetchData()
    } catch {
      alert('Erro ao criar orçamento. Já existe um para esta categoria neste mês?')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Apagar este orçamento?')) return
    await api.delete(`/budgets/${id}`)
    fetchData()
  }

  const getSpent = (categoryName: string) => {
    return transactions
      .filter(t => t.type === 'expense' && t.category?.name === categoryName)
      .reduce((sum, t) => sum + t.amount, 0)
  }

  const totalLimit = budgets.reduce((sum, b) => sum + b.amount_limit, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + getSpent(b.category.name), 0)
  const totalRemaining = totalLimit - totalSpent

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Orçamentos</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {now.toLocaleString('pt-PT', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm"
          >
            <span>+</span> Novo orçamento
          </button>
        </div>

        {/* Cards de resumo — só aparecem se houver orçamentos */}
        {budgets.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Total orçamentado</p>
              <p className="text-2xl font-bold text-white">{totalLimit.toFixed(2)}€</p>
              <p className="text-xs text-gray-500 mt-2">{budgets.length} {budgets.length === 1 ? 'categoria' : 'categorias'}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Já gasto</p>
              <p className={`text-2xl font-bold ${totalSpent > totalLimit ? 'text-red-400' : 'text-white'}`}>
                {totalSpent.toFixed(2)}€
              </p>
              <div className="mt-3 w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${totalSpent > totalLimit ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min((totalSpent / totalLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Disponível</p>
              <p className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalRemaining.toFixed(2)}€
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {totalLimit > 0 ? ((totalSpent / totalLimit) * 100).toFixed(0) : 0}% utilizado
              </p>
            </div>
          </div>
        )}

        {/* Formulário */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-4 text-sm">Novo orçamento</h3>
            <form onSubmit={handleAddBudget} className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Categoria</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm"
                  required
                >
                  <option value="">Escolhe uma categoria</option>
                  {categories
                    .filter(cat => !budgets.find(b => b.category.name === cat.name))
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Limite mensal (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount_limit}
                  onChange={e => setForm({ ...form, amount_limit: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm"
                  placeholder="Ex: 200"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg transition-colors text-sm">Guardar</button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de orçamentos */}
        {budgets.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-16 text-center">
            <p className="text-5xl mb-4">🎯</p>
            <p className="text-gray-300 font-semibold text-lg">Sem orçamentos este mês</p>
            <p className="text-gray-500 text-sm mt-2 mb-6">Define limites de gastos por categoria para controlar melhor as tuas finanças.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              + Criar primeiro orçamento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {budgets.map(budget => {
              const spent = getSpent(budget.category.name)
              const percentage = Math.min((spent / budget.amount_limit) * 100, 100)
              const remaining = budget.amount_limit - spent
              const isOver = spent > budget.amount_limit
              const isWarning = percentage >= 80 && !isOver

              return (
                <div key={budget.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 hover:border-gray-700 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gray-800 flex items-center justify-center text-2xl">
                        {budget.category.icon}
                      </div>
                      <div>
                        <p className="font-semibold">{budget.category.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {spent.toFixed(2)}€ de {budget.amount_limit.toFixed(2)}€
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOver && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-medium">
                          ⚠️ Excedido
                        </span>
                      )}
                      {isWarning && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full font-medium">
                          ⚡ Quase no limite
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors text-gray-600 text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{percentage.toFixed(0)}% utilizado</span>
                    <span className={`text-xs font-medium ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {remaining >= 0 ? `${remaining.toFixed(2)}€ disponível` : `${Math.abs(remaining).toFixed(2)}€ excedido`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}