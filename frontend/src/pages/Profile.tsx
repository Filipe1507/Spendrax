import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function Profile() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [name, setName] = useState(user.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nameSuccess, setNameSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [nameError, setNameError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameError('')
    setNameSuccess(false)
    try {
      const res = await api.put('/auth/profile', { name })
      localStorage.setItem('user', JSON.stringify({ ...user, name: res.data.name }))
      setNameSuccess(true)
    } catch {
      setNameError('Erro ao atualizar o nome')
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)
    if (newPassword !== confirmPassword) {
      setPasswordError('As passwords não coincidem')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('A password deve ter pelo menos 6 caracteres')
      return
    }
    try {
      await api.put('/auth/password', { current_password: currentPassword, new_password: newPassword })
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setPasswordError('Password atual incorreta')
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Tens a certeza? Esta ação é irreversível e apaga todos os teus dados!')) return
    try {
      await api.delete('/auth/account')
      localStorage.clear()
      navigate('/login')
    } catch {
      alert('Erro ao apagar conta')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto p-6">

        <h1 className="text-2xl font-bold mb-8">Perfil 👤</h1>

        {/* Info da conta */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-3xl">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{user.name}</p>
              <p className="text-gray-400 text-sm">{user.email}</p>
              <p className="text-gray-600 text-xs mt-1">
                Membro desde {new Date(user.created_at).toLocaleDateString('pt-PT')}
              </p>
            </div>
          </div>
        </div>

        {/* Atualizar nome */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">Atualizar nome</h2>
          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Nome</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            {nameError && <p className="text-red-400 text-sm">{nameError}</p>}
            {nameSuccess && <p className="text-emerald-400 text-sm">✓ Nome atualizado com sucesso!</p>}
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Guardar
            </button>
          </form>
        </div>

        {/* Alterar password */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">Alterar password</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Password atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Nova password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Confirmar nova password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
            {passwordSuccess && <p className="text-emerald-400 text-sm">✓ Password alterada com sucesso!</p>}
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Alterar password
            </button>
          </form>
        </div>

        {/* Zona de perigo */}
        <div className="bg-gray-900 rounded-2xl border border-red-900/50 p-6">
          <h2 className="font-semibold text-lg text-red-400 mb-2">Zona de perigo</h2>
          <p className="text-gray-400 text-sm mb-4">
            Apagar a conta remove permanentemente todos os teus dados, incluindo transações, categorias e orçamentos.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold px-6 py-3 rounded-lg transition-colors border border-red-500/30"
          >
            Apagar conta
          </button>
        </div>

      </div>
    </div>
  )
}