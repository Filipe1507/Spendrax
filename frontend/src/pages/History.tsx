import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

interface Transaction {
  id: number
  amount: number
  description: string
  date: string
  type: 'income' | 'expense'
  category: { name: string; icon: string } | null
}

interface Summary {
  income: number
  expenses: number
  balance: number
  total_transactions: number
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

type PeriodMode = 'month' | '2M' |  '3M' |'6M' | '1A' | 'MAX'

export default function History() {
  const navigate = useNavigate()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')

  const fetchMonthData = async () => {
    try {
      const [transactionsRes, summaryRes] = await Promise.all([
        api.get(`/transactions/?month=${month}&year=${year}`),
        api.get(`/transactions/summary/monthly?month=${month}&year=${year}`),
      ])
      setTransactions(transactionsRes.data)
      setSummary(summaryRes.data)
    } catch {
      navigate('/login')
    }
  }

  const fetchAllData = async () => {
    try {
      const res = await api.get('/transactions/')
      setAllTransactions(res.data)
    } catch {
      navigate('/login')
    }
  }

  useEffect(() => {
    if (periodMode === 'month') {
      fetchMonthData()
    } else {
      fetchAllData()
    }
  }, [month, year, periodMode])

  const years = [now.getFullYear() - 1, now.getFullYear()]

  const getPeriodTransactions = () => {
    if (periodMode === 'month') return transactions

    const cutoff = new Date()
    if (periodMode === '3M') cutoff.setMonth(now.getMonth() - 3)
    else if (periodMode === '2M') cutoff.setMonth(now.getMonth() - 2)
    else if (periodMode === '6M') cutoff.setMonth(now.getMonth() - 6)
    else if (periodMode === '1A') cutoff.setFullYear(now.getFullYear() - 1)
    else return allTransactions // MAX

    return allTransactions.filter(t => new Date(t.date) >= cutoff)
  }

  const periodTransactions = getPeriodTransactions()

  const filteredTransactions = useMemo(() =>
    periodTransactions.filter(t => {
      const matchSearch = t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.name.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' || t.type === filter
      return matchSearch && matchFilter
    }),
    [periodTransactions, search, filter]
  )

  const periodSummary = useMemo(() => {
    if (periodMode === 'month') return summary
    const income = periodTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = periodTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expenses, balance: income - expenses, total_transactions: periodTransactions.length }
  }, [periodMode, periodTransactions, summary])

  const exportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('Não há transações para exportar.')
      return
    }
    const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor (€)']
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('pt-PT'),
      t.description,
      t.type === 'income' ? 'Receita' : 'Despesa',
      t.category?.name || 'Sem categoria',
      t.type === 'income' ? t.amount.toFixed(2) : `-${t.amount.toFixed(2)}`
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `spendwise_historico_${periodMode}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const periodLabels: Record<PeriodMode, string> = {
    month: `${MONTHS[month - 1]} ${year}`,
    '2M': 'Últimos 2 meses',
    '3M': 'Últimos 3 meses',
    '6M': 'Últimos 6 meses',
    '1A': 'Último ano',
    'MAX': 'Desde sempre',
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Histórico</h1>
            <p className="text-gray-500 text-sm mt-0.5">{periodLabels[periodMode]}</p>
          </div>
          <button
            onClick={exportCSV}
            className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm border border-gray-700"
          >
            ⬇️ Exportar CSV
          </button>
        </div>

        {/* Botões de período */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
            {([
              { value: 'month', label: 'Mês' },
              { value: '2M', label: '2M' },
              { value: '3M', label: '3M' },
              { value: '6M', label: '6M' },
              { value: '1A', label: '1 Ano' },
              { value: 'MAX', label: 'Tudo' },
            ] as { value: PeriodMode; label: string }[]).map(p => (
              <button
                key={p.value}
                onClick={() => setPeriodMode(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  periodMode === p.value
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Seletor mês/ano — só aparece no modo mês */}
          {periodMode === 'month' && (
            <div className="flex items-center gap-2">
              <select
                value={month}
                onChange={e => setMonth(parseInt(e.target.value))}
                className="bg-gray-900 text-white rounded-xl px-4 py-2 border border-gray-800 focus:border-emerald-500 focus:outline-none text-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={e => setYear(parseInt(e.target.value))}
                className="bg-gray-900 text-white rounded-xl px-4 py-2 border border-gray-800 focus:border-emerald-500 focus:outline-none text-sm"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          <span className="text-gray-600 text-sm ml-2">
            {filteredTransactions.length} transações
          </span>
        </div>

        {/* Cards de resumo */}
        {periodSummary && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Saldo</p>
              <p className={`text-2xl font-bold ${periodSummary.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {periodSummary.balance.toFixed(2)}€
              </p>
              <p className="text-xs text-gray-500 mt-2">{periodLabels[periodMode]}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Receitas</p>
              <p className="text-2xl font-bold text-emerald-400">+{periodSummary.income.toFixed(2)}€</p>
              <p className="text-xs text-gray-500 mt-2">
                {filteredTransactions.filter(t => t.type === 'income').length} entradas
              </p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Despesas</p>
              <p className="text-2xl font-bold text-red-400">-{periodSummary.expenses.toFixed(2)}€</p>
              <p className="text-xs text-gray-500 mt-2">
                {filteredTransactions.filter(t => t.type === 'expense').length} saídas
              </p>
            </div>
          </div>
        )}

        {/* Lista de transações */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex flex-wrap justify-between items-center gap-3">
            <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
              {[
                { value: 'all', label: 'Todas' },
                { value: 'income', label: '💵 Receitas' },
                { value: 'expense', label: '💸 Despesas' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value as any)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filter === f.value ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Pesquisar..."
              className="bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm w-56"
            />
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-gray-400 font-medium">
                {search || filter !== 'all'
                  ? 'Nenhuma transação encontrada.'
                  : `Sem transações em ${periodLabels[periodMode]}.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/50 transition-colors">
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
                  <span className={`font-bold text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)}€
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}