import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AboutPage from './pages/AboutPage.jsx'
import AdminLoginPage from './pages/AdminLoginPage.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import GovLoginPage from './pages/GovLoginPage.jsx'
import GovDashboard from './pages/GovDashboard.jsx'

function AdminGuard({ children }) {
  const isAdmin = !!sessionStorage.getItem('streetiq_admin');
  return isAdmin ? children : <Navigate to="/admin" replace />;
}

function GovGuard({ children }) {
  const isGov = !!sessionStorage.getItem('streetiq_gov');
  return isGov ? children : <Navigate to="/gov" replace />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/gov" element={<GovLoginPage />} />
        <Route path="/gov/dashboard" element={<GovGuard><GovDashboard /></GovGuard>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
