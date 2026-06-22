import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

interface SavingsGoal {
  id: number
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  icon: string
}

const ICONS = ['🎯', '🏠', '🚗', '✈️', '💻', '📱', '🎓', '💍', '🏖️', '🎸', '⚽', '🐶']

export default function Savings() {
  const navigate = useNavigate()
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [form, setForm] = useState({
    name: '', target_amount: '', current_amount: '', deadline: '', icon: '🎯',
  })

  const fetchGoals = async () => {
    try {
      const res = await api.get('/savings/')
      setGoals(res.data)
    } catch {
      navigate('/login')
    }
  }

  useEffect(() => { fetchGoals() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/savings/', {
        name: form.name,
        target_amount: parseFloat(form.target_amount),
        current_amount: form.current_amount ? parseFloat(form.current_amount) : 0,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        icon: form.icon,
      })
      setShowForm(false)
      setForm({ name: '', target_amount: '', current_amount: '', deadline: '', icon: '🎯' })
      fetchGoals()
    } catch {
      alert('Erro ao criar meta')
    }
  }

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!depositGoal) return
    try {
      const newAmount = depositGoal.current_amount + parseFloat(depositAmount)
      await api.put(`/savings/${depositGoal.id}`, { current_amount: newAmount })
      setDepositGoal(null)
      setDepositAmount('')
      fetchGoals()
    } catch {
      alert('Erro ao atualizar meta')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Apagar esta meta?')) return
    await api.delete(`/savings/${id}`)
    fetchGoals()
  }

  // Resumo geral
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0)
  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0)
  const completedGoals = goals.filter(g => g.current_amount >= g.target_amount).length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Metas de Poupança</h1>
            <p className="text-gray-500 text-sm mt-0.5">Acompanha os teus objetivos financeiros</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm"
          >
            <span>+</span> Nova meta
          </button>
        </div>

        {/* Cards de resumo */}
        {goals.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Total poupado</p>
              <p className="text-2xl font-bold text-emerald-400">{totalSaved.toFixed(2)}€</p>
              <p className="text-xs text-gray-500 mt-2">de {totalTarget.toFixed(2)}€ objetivo total</p>
              <div className="mt-3 w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Metas ativas</p>
              <p className="text-2xl font-bold text-white">{goals.length - completedGoals}</p>
              <p className="text-xs text-gray-500 mt-2">em progresso</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Concluídas</p>
              <p className="text-2xl font-bold text-emerald-400">{completedGoals}</p>
              <p className="text-xs text-gray-500 mt-2">
                {goals.length > 0 ? ((completedGoals / goals.length) * 100).toFixed(0) : 0}% das metas
              </p>
            </div>
          </div>
        )}

        {/* Formulário */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold mb-4 text-sm">Nova meta de poupança</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Nome da meta</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm"
                    placeholder="Ex: Férias, Carro novo..."
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Valor objetivo (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.target_amount}
                    onChange={e => setForm({ ...form, target_amount: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm"
                    placeholder="Ex: 5000"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Já tenho poupado (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.current_amount}
                    onChange={e => setForm({ ...form, current_amount: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Data limite (opcional)</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm({ ...form, deadline: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Ícone</label>
                <div className="flex gap-2 flex-wrap">
                  {ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                        form.icon === icon ? 'bg-emerald-500' : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg transition-colors text-sm">Criar meta</button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de metas */}
        {goals.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-16 text-center">
            <p className="text-5xl mb-4">🎯</p>
            <p className="text-gray-300 font-semibold text-lg">Sem metas de poupança</p>
            <p className="text-gray-500 text-sm mt-2 mb-6">Define objetivos financeiros e acompanha o teu progresso.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              + Criar primeira meta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {goals.map(goal => {
              const percentage = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
              const remaining = goal.target_amount - goal.current_amount
              const isComplete = goal.current_amount >= goal.target_amount

              const daysLeft = goal.deadline
                ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : null

              return (
                <div key={goal.id} className={`bg-gray-900 rounded-2xl border p-6 hover:border-gray-700 transition-colors ${isComplete ? 'border-emerald-500/30' : 'border-gray-800'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isComplete ? 'bg-emerald-500/20' : 'bg-gray-800'}`}>
                        {goal.icon}
                      </div>
                      <div>
                        <p className="font-semibold">{goal.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {goal.current_amount.toFixed(2)}€ de {goal.target_amount.toFixed(2)}€
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-medium">
                          ✅ Concluído
                        </span>
                      ) : daysLeft !== null && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          daysLeft < 0 ? 'bg-red-500/20 text-red-400' :
                          daysLeft < 30 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {daysLeft < 0 ? 'Prazo ultrapassado' : `${daysLeft} dias`}
                        </span>
                      )}
                      {!isComplete && (
                        <button
                          onClick={() => { setDepositGoal(goal); setDepositAmount('') }}
                          className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full transition-colors font-medium"
                        >
                          + Depositar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors text-gray-600 text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{percentage.toFixed(0)}% concluído</span>
                    {!isComplete && (
                      <span className="text-xs text-gray-400">Faltam <span className="text-white font-medium">{remaining.toFixed(2)}€</span></span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Modal de depósito */}
      {depositGoal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDepositGoal(null) }}
        >
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-gray-800 flex items-center justify-center text-2xl">
                {depositGoal.icon}
              </div>
              <div>
                <h2 className="font-semibold">{depositGoal.name}</h2>
                <p className="text-xs text-gray-400">
                  {depositGoal.current_amount.toFixed(2)}€ / {depositGoal.target_amount.toFixed(2)}€
                </p>
              </div>
            </div>

            {/* Progresso atual */}
            <div className="w-full bg-gray-800 rounded-full h-1.5 mb-5">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${Math.min((depositGoal.current_amount / depositGoal.target_amount) * 100, 100)}%` }}
              />
            </div>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Valor a depositar (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>
              {depositAmount && parseFloat(depositAmount) > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-emerald-400">
                    Após depósito: {(depositGoal.current_amount + parseFloat(depositAmount)).toFixed(2)}€
                    ({Math.min(((depositGoal.current_amount + parseFloat(depositAmount)) / depositGoal.target_amount) * 100, 100).toFixed(0)}%)
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setDepositGoal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors text-sm">Cancelar</button>
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-lg transition-colors text-sm">Depositar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}