import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AdminSignIn } from './AdminSignIn.tsx'

const isAdminSignIn = window.location.pathname.replace(/\/+$/, '') === '/admin/myself'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminSignIn ? <AdminSignIn /> : <App />}
  </StrictMode>,
)
