import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AdminRoute } from './AdminRoute'

const isAdminSignIn = window.location.pathname.replace(/\/+$/, '') === '/admin/myself'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminSignIn ? <AdminRoute /> : <App />}
  </StrictMode>,
)
