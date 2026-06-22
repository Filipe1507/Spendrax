import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Budgets from './pages/Budgets'
import History from './pages/History'
import Categories from './pages/Categories'
import Report from './pages/Report'
import Profile from './pages/Profile'
import Navbar from './components/Navbar'
import Savings from './pages/Savings'
import Recurring from './pages/Recurring'

function PrivateLayout({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" />
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/savings" element={<PrivateLayout><Savings /></PrivateLayout>} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateLayout><Dashboard /></PrivateLayout>} />
        <Route path="/budgets" element={<PrivateLayout><Budgets /></PrivateLayout>} />
        <Route path="/history" element={<PrivateLayout><History /></PrivateLayout>} />
        <Route path="/categories" element={<PrivateLayout><Categories /></PrivateLayout>} />
        <Route path="/report" element={<PrivateLayout><Report /></PrivateLayout>} />
        <Route path="/recurring" element={<PrivateLayout><Recurring /></PrivateLayout>} />
        <Route path="/profile" element={<PrivateLayout><Profile /></PrivateLayout>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)