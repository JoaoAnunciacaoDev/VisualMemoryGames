import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import '@/index.css'
import '@/styles/tokens.css';
import '@/styles/base.css';
import { registerServiceWorker } from './registerServiceWorker'

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
