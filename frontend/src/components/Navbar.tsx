import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/budgets', label: 'Orçamentos', icon: '🎯' },
  { path: '/savings', label: 'Poupanças', icon: '💰' },
  { path: '/history', label: 'Histórico', icon: '📅' },
  { path: '/categories', label: 'Categorias', icon: '🏷️' },
  { path: '/report', label: 'Relatório', icon: '📈' },
  { path: '/recurring', label: 'Recorrentes', icon: '🔄' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">

        {/* Logo */}
        <span className="text-base font-bold text-white whitespace-nowrap">💰 SpendWise</span>

        {/* Nav items — centrado */}
        <div className="hidden lg:flex items-center justify-end gap-2 flex-1 mr-16">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                location.pathname === item.path
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              <span className="hidden xl:block">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Utilizador + Sair */}
        <div className="hidden lg:flex items-center gap-2">
          <Link
            to="/profile"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-gray-400 group-hover:text-white text-xs transition-colors whitespace-nowrap">
              Olá, {user.name}!
            </span>
          </Link>
          <button
            onClick={handleLogout}
            className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap"
          >
            Sair
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden text-gray-400 hover:text-white p-2 text-lg ml-auto"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-gray-900 border-t border-gray-800 px-4 py-3 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="border-t border-gray-800 pt-3 mt-3 flex items-center justify-between">
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-gray-400 text-sm">Olá, {user.name}!</span>
            </Link>
            <button
              onClick={handleLogout}
              className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}