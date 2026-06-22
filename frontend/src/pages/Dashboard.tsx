import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import api from '../api/axios'
import AIChat from '../components/AIChat'

interface Summary {
  income: number
  expenses: number
  balance: number
  total_transactions: number
}

interface Transaction {
  id: number
  amount: number
  description: string
  date: string
  type: 'income' | 'expense'
  category: { name: string; icon: string } | null
  category_id: number | null
}

interface Category {
  id: number
  name: string
  icon: string
  color: string
}

const COLORS = ['#10b981', '#3b82f6', '#a855f7', '#ef4444', '#f97316', '#eab308']

export default function Dashboard() {
  const navigate = useNavigate()
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())
  const [summary, setSummary] = useState<Summary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState({
    description: '', amount: '', type: 'expense', category_id: '', date: '',
  })
  const [form, setForm] = useState({
    description: '', amount: '', type: 'expense', category_id: '',
    date: new Date().toISOString().split('T')[0],
  })

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, transactionsRes, categoriesRes] = await Promise.all([
        api.get(`/transactions/summary/monthly?month=${month}&year=${year}`),
        api.get(`/transactions/?month=${month}&year=${year}`),
        api.get('/categories/'),
      ])
      setSummary(summaryRes.data)
      setTransactions(transactionsRes.data)
      setCategories(categoriesRes.data)
    } catch {
      navigate('/login')
    }
  }, [month, year])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/transactions/', {
        ...form,
        amount: parseFloat(form.amount),
        category_id: form.category_id ? parseInt(form.category_id) : null,
        date: new Date(form.date).toISOString(),
      })
      setShowForm(false)
      setForm({ description: '', amount: '', type: 'expense', category_id: '', date: new Date().toISOString().split('T')[0] })
      fetchData()
    } catch {
      alert('Erro ao adicionar transação')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Apagar esta transação?')) return
    await api.delete(`/transactions/${id}`)
    fetchData()
  }

  const handleEditClick = (t: Transaction) => {
    setEditingTransaction(t)
    setEditForm({
      description: t.description,
      amount: t.amount.toString(),
      type: t.type,
      category_id: t.category_id?.toString() || '',
      date: new Date(t.date).toISOString().split('T')[0],
    })
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTransaction) return
    try {
      await api.put(`/transactions/${editingTransaction.id}`, {
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        type: editForm.type,
        category_id: editForm.category_id ? parseInt(editForm.category_id) : null,
        date: new Date(editForm.date).toISOString(),
      })
      setEditingTransaction(null)
      fetchData()
    } catch {
      alert('Erro ao editar transação')
    }
  }

  const chartData = useMemo(() =>
    categories
      .map(cat => {
        const total = transactions
          .filter(t => t.type === 'expense' && t.category?.name === cat.name)
          .reduce((sum, t) => sum + t.amount, 0)
        return { name: cat.name, value: total, icon: cat.icon }
      })
      .filter(d => d.value > 0),
    [transactions, categories]
  )

  const dailyData = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const days: { day: string; receitas: number; despesas: number }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.date)
        return tDate.getDate() === d &&
          tDate.getMonth() + 1 === month &&
          tDate.getFullYear() === year
      })
      days.push({
        day: `${d}`,
        receitas: dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        despesas: dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      })
    }
    return days
  }, [transactions, month, year])

  const filteredTransactions = useMemo(() =>
    transactions.filter(t =>
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.name.toLowerCase().includes(search.toLowerCase())
    ),
    [transactions, search]
  )

  const savingsRate = summary && summary.income > 0
    ? ((summary.balance / summary.income) * 100).toFixed(0)
    : '0'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {now.toLocaleString('pt-PT', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Resumo financeiro do mês</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm"
          >
            <span>+</span> Adicionar transação
          </button>
        </div>

        {/* Cards de resumo — 3 cards */}
        {summary && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Saldo</p>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">{savingsRate}% poupado</span>
              </div>
              <p className={`text-3xl font-bold ${summary.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {summary.balance.toFixed(2)}€
              </p>
              <div className="mt-3 w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(parseInt(savingsRate), 100)}%` }}
                />
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Receitas</p>
                <span className="w-7 h-7 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-xs font-bold">↑</span>
              </div>
              <p className="text-3xl font-bold text-emerald-400">+{summary.income.toFixed(2)}€</p>
              <p className="text-xs text-gray-500 mt-3">
                {filteredTransactions.filter(t => t.type === 'income').length} entradas este mês
              </p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Despesas</p>
                <span className="w-7 h-7 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 text-xs font-bold">↓</span>
              </div>
              <p className="text-3xl font-bold text-red-400">-{summary.expenses.toFixed(2)}€</p>
              <p className="text-xs text-gray-500 mt-3">
                {summary.income > 0 ? ((summary.expenses / summary.income) * 100).toFixed(0) : 0}% do rendimento mensal
              </p>
            </div>
          </div>
        )}

        {/* Layout principal — gráfico diário grande + pie pequena */}
        <div className="grid grid-cols-4 gap-6 mb-6">

          {/* Gráfico diário — 3/4 */}
          <div className="col-span-3 bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-semibold">Fluxo diário</h2>
                <p className="text-xs text-gray-500 mt-0.5">Receitas e despesas por dia do mês</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={(v) => v > 0 ? `${v}€` : ''}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                  labelFormatter={(label) => `Dia ${label} de ${now.toLocaleString('pt-PT', { month: 'long' })}`}
                  formatter={(value, name) => [
                  ` ${Number(value).toFixed(2)}€`,
                    name === 'receitas' ? '💵 Receitas' : '💸 Despesas'
                  ]}
                />
                <Legend
                     formatter={(value) => (
                       <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                       {value === 'receitas' ? '💵 Receitas' : '💸 Despesas'}
                      </span>
                     )}                 
                />
                <Bar dataKey="receitas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Bar dataKey="despesas" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie pequena — 1/4 */}
          <div className="col-span-1 bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h2 className="font-semibold text-sm mb-1">Por categoria</h2>
            <p className="text-xs text-gray-500 mb-3">Distribuição de despesas</p>
            {chartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                      {chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(2)}€`]}
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {chartData.slice(0, 4).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-xs text-gray-400 truncate max-w-16">{item.icon} {item.name}</span>
                      </div>
                      <span className="text-xs font-medium text-white">{item.value.toFixed(0)}€</span>
                    </div>
                  ))}
                  {chartData.length > 4 && (
                    <p className="text-xs text-gray-600">+{chartData.length - 4} mais</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600">
                <p className="text-3xl mb-2">📊</p>
                <p className="text-xs text-center">Sem despesas por categoria</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Chat — largura total */}
        <div className="mb-6">
          <AIChat categories={categories} onTransactionAdded={fetchData} />
        </div>

        {/* Formulário manual */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-4 text-sm">Nova transação manual</h3>
            <form onSubmit={handleAddTransaction} className="grid grid-cols-6 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Descrição</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm" placeholder="Ex: Almoço..." required />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Valor (€)</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm" placeholder="0.00" required />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm">
                  <option value="expense">💸 Despesa</option>
                  <option value="income">💵 Receita</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Categoria</label>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm">
                  <option value="">Sem categoria</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Data</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm" required />
              </div>
              <div className="col-span-6 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg transition-colors text-sm">Guardar</button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de transações */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-center gap-4">
            <div>
              <h2 className="font-semibold text-sm">Transações de {now.toLocaleString('pt-PT', { month: 'long' })}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{filteredTransactions.length} transações</p>
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Pesquisar..."
              className="bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm w-64"
            />
          </div>
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">💸</p>
              <p className="text-gray-400 font-medium">{search ? 'Nenhuma transação encontrada.' : 'Ainda não há transações este mês.'}</p>
              <p className="text-gray-600 text-sm mt-1">{!search && 'Usa o chatbot IA ou adiciona manualmente!'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
                      {t.category?.icon || '💰'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t.description}</p>
                      <p className="text-xs text-gray-500">
                        {t.category?.name || 'Sem categoria'} · {new Date(t.date).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)}€
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditClick(t)} className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center justify-center transition-colors text-gray-500 text-xs">✏️</button>
                      <button onClick={() => handleDelete(t.id)} className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors text-gray-500 text-xs">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal de edição */}
      {editingTransaction && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={(e) => { if (e.target === e.currentTarget) setEditingTransaction(null) }}>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-5">Editar transação</h2>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Descrição</label>
                <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Valor (€)</label>
                  <input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none" required />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
                  <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })} className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none">
                    <option value="expense">💸 Despesa</option>
                    <option value="income">💵 Receita</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Categoria</label>
                  <select value={editForm.category_id} onChange={e => setEditForm({ ...editForm, category_id: e.target.value })} className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none">
                    <option value="">Sem categoria</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Data</label>
                  <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none" required />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-lg transition-colors">Guardar</button>
                <button type="button" onClick={() => setEditingTransaction(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}