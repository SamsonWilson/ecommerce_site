import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/config.js'
import './styles/ueeshop.css'
import './styles/pages.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
