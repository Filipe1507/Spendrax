import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

interface Category {
  id: number
  name: string
  icon: string
  color: string
}

const ICONS = ['🍔', '🚗', '🎮', '💊', '🏠', '💼', '✈️', '👕', '📚', '🎵', '🐶', '⚽', '💇', '🍕', '☕', '🛒', '💡', '📱']
const COLORS = ['#10b981', '#3b82f6', '#a855f7', '#ef4444', '#f97316', '#eab308', '#ec4899', '#14b8a6']

export default function Categories() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', icon: '🍔', color: '#10b981' })

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories/')
      setCategories(res.data)
    } catch {
      navigate('/login')
    }
  }

  useEffect(() => { fetchCategories() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/categories/', form)
      setShowForm(false)
      setForm({ name: '', icon: '🍔', color: '#10b981' })
      fetchCategories()
    } catch {
      alert('Erro ao criar categoria')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Apagar esta categoria? As transações associadas ficam sem categoria.')) return
    try {
      await api.delete(`/categories/${id}`)
      fetchCategories()
    } catch {
      alert('Erro ao apagar categoria')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto p-6">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Categorias 🏷️</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm"
          >
            {showForm ? '✕ Cancelar' : '+ Nova categoria'}
          </button>
        </div>

        {/* Formulário */}
        {showForm && (
          <form
            onSubmit={handleAdd}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                  placeholder="Ex: Subscrições"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Cor</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Ícone</label>
              <div className="flex gap-2 flex-wrap">
                {ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setForm({ ...form, icon })}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      form.icon === icon ? 'bg-emerald-500' : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
                <span className="text-2xl">{form.icon}</span>
                <span className="font-medium" style={{ color: form.color }}>{form.name || 'Pré-visualização'}</span>
              </div>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Guardar
              </button>
            </div>
          </form>
        )}

        {/* Lista de categorias */}
        <div className="grid grid-cols-2 gap-4">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="bg-gray-900 rounded-2xl border border-gray-800 p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: cat.color + '20' }}
                >
                  {cat.icon}
                </div>
                <span className="font-medium" style={{ color: cat.color }}>{cat.name}</span>
              </div>
              <button
                onClick={() => handleDelete(cat.id)}
                className="text-gray-600 hover:text-red-400 transition-colors"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}