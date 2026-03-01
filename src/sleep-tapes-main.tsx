import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SleepTapes } from './pages/SleepTapes/SleepTapes'
import './theme/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SleepTapes />
  </StrictMode>
)
