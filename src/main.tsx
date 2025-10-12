import React from 'react'
import { createRoot } from 'react-dom/client'
import FoodAnalyzerApp from './FoodAnalyzerApp'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FoodAnalyzerApp />
  </React.StrictMode>
)
