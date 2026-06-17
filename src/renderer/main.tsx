import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

async function bootstrap(): Promise<void> {
  const platform = await window.conduit.app.getPlatform()
  document.documentElement.dataset.platform = platform

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

bootstrap()
