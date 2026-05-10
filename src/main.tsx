import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const label = window.location.hash.replace(/^#/, '')
if (label === 'settings' || label === 'chat') {
  document.body.classList.add('has-background')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
