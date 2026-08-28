import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import api from '../api/axios'

interface Summary {
  income: number
  expenses: number
  balance: number
  month: number
  year: number
}

interface RecurringTransaction {
  amount: number
  type: string
  description: string
}

interface AIPrediction {
  profile: string
  profile_label: string
  summary: string
  monthly_savings_potential: number
  predictions: {
    period: string
    months: number
    predicted_expenses: number
    predicted_savings: number
    cumulative_savings: number
  }[]
  insights: {
    title: string
    description: string
    impact: string
    saving: number
  }[]
  recommendations: string[]
  warning: string | null
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

type RangeOption = '1S' | '1M' | '3M' | '6M' | 'YTD' | 'MAX' | 'COMPARE'
type PredictionPeriod = '1M' | '3M' | '6M' | '1A'

export default function Report() {
  const navigate = useNavigate()
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [allSummaries, setAllSummaries] = useState<Summary[]>([])
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<RangeOption>('6M')
  const [compareA, setCompareA] = useState({ month: currentMonth === 1 ? 12 : currentMonth - 1, year: currentMonth === 1 ? currentYear - 1 : currentYear })
  const [compareB, setCompareB] = useState({ month: currentMonth, year: currentYear })
  const [prediction, setPrediction] = useState<AIPrediction | null>(null)
  const [predictionLoading, setPredictionLoading] = useState(false)
  const [predictionError, setPredictionError] = useState('')
  const [predictionPeriod, setPredictionPeriod] = useState<PredictionPeriod>('1M')

  const fetchData = useCallback(async () => {
    try {
      const [rangeRes, recurringRes] = await Promise.all([
        api.get('/transactions/summary/range?months=24'),
        api.get('/transactions/list/recurring')
      ])

      const dataMap = new Map<string, Summary>(
        rangeRes.data.map((s: Summary) => [`${s.year}-${s.month}`, s] as [string, Summary])
      )

      const fullSummaries: Summary[] = []
      for (let i = 23; i >= 0; i--) {
        let m = currentMonth - i
        let y = currentYear
        while (m <= 0) { m += 12; y -= 1 }
        const key = `${y}-${m}`
        const found = dataMap.get(key)
        fullSummaries.push(found !== undefined ? found : { month: m, year: y, income: 0, expenses: 0, balance: 0 })
      }

      setAllSummaries(fullSummaries)
      setRecurringTransactions(recurringRes.data)
    } catch {
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }, [currentMonth, currentYear])

  useEffect(() => { fetchData() }, [fetchData])

  const getFilteredSummaries = (): Summary[] => {
    if (range === 'COMPARE') return []
    if (range === 'MAX') return allSummaries.filter(s => s.income > 0 || s.expenses > 0)
    const now = new Date()
    let cutoff = new Date()
    if (range === '1S') cutoff.setDate(now.getDate() - 7)
    else if (range === '1M') cutoff.setMonth(now.getMonth() - 1)
    else if (range === '3M') cutoff.setMonth(now.getMonth() - 3)
    else if (range === '6M') cutoff.setMonth(now.getMonth() - 6)
    else if (range === 'YTD') cutoff = new Date(currentYear, 0, 1)
    return allSummaries.filter(s => {
      const date = new Date(s.year, s.month - 1, 1)
      return date >= cutoff
    })
  }

  const filteredSummaries = getFilteredSummaries()

  const chartData = filteredSummaries.map(s => ({
    name: `${MONTHS[s.month - 1]} ${s.year !== currentYear ? s.year : ''}`.trim(),
    Receitas: s.income,
    Despesas: s.expenses,
  }))

  const getCompareSummary = (month: number, year: number) => {
    return allSummaries.find(s => s.month === month && s.year === year) || { income: 0, expenses: 0, balance: 0, month, year }
  }

  const compareChartData = [
    {
      name: `${MONTHS_FULL[compareA.month - 1]} ${compareA.year}`,
      Receitas: getCompareSummary(compareA.month, compareA.year).income,
      Despesas: getCompareSummary(compareA.month, compareA.year).expenses,
    },
    {
      name: `${MONTHS_FULL[compareB.month - 1]} ${compareB.year}`,
      Receitas: getCompareSummary(compareB.month, compareB.year).income,
      Despesas: getCompareSummary(compareB.month, compareB.year).expenses,
    }
  ]

  const currentSummary = allSummaries[allSummaries.length - 1]
  const previousSummary = allSummaries[allSummaries.length - 2]

  const getDiff = (current: number, previous: number) => {
    if (!previous || previous === 0) return null
    return ((current - previous) / previous) * 100
  }

  const fixedExpenses = recurringTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const handlePredict = async () => {
    setPredictionLoading(true)
    setPredictionError('')
    setPrediction(null)

    try {
      const res = await api.post('/ai/report', { period: predictionPeriod })
      setPrediction(res.data)
    } catch (err: any) {
      const status = err.response?.status
      if (status === 429 || status === 400) {
        setPredictionError(err.response.data.detail)
      } else if (status === 504) {
        setPredictionError('A análise demorou demasiado tempo. Tenta novamente.')
      } else {
        setPredictionError('Erro ao gerar previsão. Tenta novamente.')
      }
    } finally {
      setPredictionLoading(false)
    }
  }

  const rangeButtons: { label: string; value: RangeOption }[] = [
    { label: '1S', value: '1S' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: 'YTD', value: 'YTD' },
    { label: 'MAX', value: 'MAX' },
    { label: '⇄ Comparar', value: 'COMPARE' },
  ]

  const years = [currentYear - 1, currentYear]

  const profileColors: Record<string, string> = {
    poupador: 'text-emerald-400 bg-emerald-500/20',
    equilibrado: 'text-blue-400 bg-blue-500/20',
    gastador: 'text-red-400 bg-red-500/20',
    irregular: 'text-yellow-400 bg-yellow-500/20',
  }

  const impactColors: Record<string, string> = {
    alto: 'text-red-400 bg-red-500/20',
    médio: 'text-yellow-400 bg-yellow-500/20',
    baixo: 'text-emerald-400 bg-emerald-500/20',
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto p-6">

        <h1 className="text-2xl font-bold mb-2">Relatório 📈</h1>
        <p className="text-gray-400 mb-8">Análise detalhada das tuas finanças</p>

        {loading ? (
          <div className="text-center text-gray-500 py-20">A carregar dados...</div>
        ) : (
          <>
            {/* Comparação mês atual vs anterior */}
            {currentSummary && previousSummary && range !== 'COMPARE' && (
              <div className="mb-8">
                <h2 className="font-semibold text-lg mb-4">
                  {MONTHS_FULL[currentSummary.month - 1]} vs {MONTHS_FULL[previousSummary.month - 1]}
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Receitas', current: currentSummary.income, previous: previousSummary.income, positive: true },
                    { label: 'Despesas', current: currentSummary.expenses, previous: previousSummary.expenses, positive: false },
                    { label: 'Saldo', current: currentSummary.balance, previous: previousSummary.balance, positive: true },
                  ].map(item => {
                    const diff = getDiff(item.current, item.previous)
                    const isGood = item.positive ? (diff !== null && diff >= 0) : (diff !== null && diff <= 0)
                    return (
                      <div key={item.label} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                        <p className="text-gray-400 text-sm mb-1">{item.label}</p>
                        <p className="text-2xl font-bold mb-2">{item.current.toFixed(2)}€</p>
                        <p className="text-xs text-gray-500 mb-1">Mês anterior: {item.previous.toFixed(2)}€</p>
                        {diff !== null && (
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${isGood ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {diff >= 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Gráfico */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
              <h2 className="font-semibold text-lg mb-4">
                {range === 'COMPARE'
                  ? `${MONTHS_FULL[compareA.month - 1]} ${compareA.year} vs ${MONTHS_FULL[compareB.month - 1]} ${compareB.year}`
                  : 'Receitas vs Despesas'}
              </h2>

              {range === 'COMPARE' && (
                <div className="flex gap-4 mb-6">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Mês A</label>
                    <div className="flex gap-2">
                      <select value={compareA.month} onChange={e => setCompareA({ ...compareA, month: parseInt(e.target.value) })} className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm">
                        {MONTHS_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                      <select value={compareA.year} onChange={e => setCompareA({ ...compareA, year: parseInt(e.target.value) })} className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-end pb-2 text-gray-500 font-bold">vs</div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Mês B</label>
                    <div className="flex gap-2">
                      <select value={compareB.month} onChange={e => setCompareB({ ...compareB, month: parseInt(e.target.value) })} className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm">
                        {MONTHS_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                      <select value={compareB.year} onChange={e => setCompareB({ ...compareB, year: parseInt(e.target.value) })} className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={range === 'COMPARE' ? compareChartData : chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={v => `${v}€`} />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}€`]} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="flex gap-1 mt-4 border-t border-gray-800 pt-4">
                {rangeButtons.map(btn => (
                  <button key={btn.value} onClick={() => setRange(btn.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${range === btn.value ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Previsão com IA */}
            <div className="bg-gray-900 rounded-2xl border border-purple-500/30 p-6 mb-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="font-semibold text-lg">🔮 Análise & Previsão com IA</h2>
                  <p className="text-gray-400 text-sm mt-1">Coaching financeiro personalizado baseado nos teus padrões reais</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
                    {(['1M', '3M', '6M', '1A'] as PredictionPeriod[]).map(p => (
                      <button
                        key={p}
                        onClick={() => setPredictionPeriod(p)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${predictionPeriod === p ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handlePredict}
                    disabled={predictionLoading}
                    className="bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm"
                  >
                    {predictionLoading ? '🔮 A analisar...' : '🔮 Analisar agora'}
                  </button>
                </div>
              </div>

              {predictionError && <p className="text-red-400 text-sm mb-4">{predictionError}</p>}

              {!prediction && !predictionLoading && !predictionError && (
                <div className="text-center text-gray-500 py-8 text-sm border border-dashed border-gray-800 rounded-xl">
                  Seleciona o período e clica em "Analisar agora" para receberes uma análise financeira personalizada.
                </div>
              )}

              {prediction && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${profileColors[prediction.profile] || 'text-gray-400 bg-gray-800'}`}>
                      {prediction.profile.charAt(0).toUpperCase() + prediction.profile.slice(1)}
                    </span>
                    <p className="text-gray-300 text-sm">{prediction.profile_label}</p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-4 border-l-4 border-purple-500">
                    <p className="text-sm text-gray-300 leading-relaxed">{prediction.summary}</p>
                  </div>

                  {prediction.warning && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <p className="text-xs font-semibold text-red-400 mb-1">⚠️ Atenção</p>
                      <p className="text-sm text-gray-300">{prediction.warning}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-3 text-gray-200">📅 Previsão financeira</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {prediction.predictions.map((p, i) => (
                        <div key={i} className="bg-gray-800 rounded-xl p-4">
                          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">{p.period}</p>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-400">Despesas previstas</span>
                              <span className="text-xs text-red-400 font-medium">{p.predicted_expenses.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-400">Poupança mensal</span>
                              <span className="text-xs text-emerald-400 font-medium">{p.predicted_savings.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-700 pt-2">
                              <span className="text-xs text-gray-300 font-medium">Total acumulado</span>
                              <span className="text-sm text-emerald-400 font-bold">{p.cumulative_savings.toFixed(2)}€</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-xs text-emerald-400 font-semibold mb-1">💰 Potencial de poupança mensal</p>
                    <p className="text-2xl font-bold text-emerald-400">{prediction.monthly_savings_potential.toFixed(2)}€/mês</p>
                    <p className="text-xs text-gray-400 mt-1">Valor que podes poupar com pequenos ajustes no teu estilo de vida</p>
                  </div>

                  {prediction.insights.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-gray-200">💡 Insights personalizados</h3>
                      <div className="space-y-3">
                        {prediction.insights.map((insight, i) => (
                          <div key={i} className="bg-gray-800 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-medium text-sm">{insight.title}</p>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${impactColors[insight.impact] || 'text-gray-400 bg-gray-700'}`}>
                                  {insight.impact}
                                </span>
                                {insight.saving > 0 && (
                                  <span className="text-xs text-emerald-400 font-semibold">+{insight.saving.toFixed(2)}€/mês</span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">{insight.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {prediction.recommendations.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-gray-200">🎯 Recomendações concretas</h3>
                      <div className="space-y-2">
                        {prediction.recommendations.map((rec, i) => (
                          <div key={i} className="flex gap-3 bg-gray-800 rounded-xl p-4">
                            <span className="text-purple-400 font-bold text-sm">{i + 1}.</span>
                            <p className="text-sm text-gray-300">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tabela resumo */}
            {range !== 'COMPARE' && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden mt-6">
                <div className="p-6 border-b border-gray-800">
                  <h2 className="font-semibold">Resumo por mês</h2>
                  {fixedExpenses > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      💡 Despesas fixas mensais: <span className="text-orange-400">{fixedExpenses.toFixed(2)}€</span>
                    </p>
                  )}
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-4 text-gray-400 text-sm font-medium">Mês</th>
                      <th className="text-right p-4 text-gray-400 text-sm font-medium">Receitas</th>
                      <th className="text-right p-4 text-gray-400 text-sm font-medium">Despesas Fixas</th>
                      <th className="text-right p-4 text-gray-400 text-sm font-medium">Despesas do Mês</th>
                      <th className="text-right p-4 text-gray-400 text-sm font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSummaries.slice().reverse().map((s, i) => {
                      const varExpenses = Math.max(0, s.expenses - fixedExpenses)
                      return (
                        <tr key={i} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                          <td className="p-4 font-medium">{MONTHS_FULL[s.month - 1]} {s.year}</td>
                          <td className="p-4 text-right text-emerald-400">+{s.income.toFixed(2)}€</td>
                          <td className="p-4 text-right text-orange-400">{fixedExpenses > 0 ? `-${fixedExpenses.toFixed(2)}€` : '—'}</td>
                          <td className="p-4 text-right text-red-400">-{varExpenses.toFixed(2)}€</td>
                          <td className={`p-4 text-right font-bold ${s.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{s.balance.toFixed(2)}€</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}