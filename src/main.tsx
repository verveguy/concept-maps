/**
 * Application entry point.
 * Initializes React and renders the root App component.
 * Also sets up React Scan for performance debugging in development mode.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize React Scan in development mode for debugging
if (import.meta.env.DEV) {
  import('react-scan').then(({ scan }) => {
    scan({
      enabled: true,
      log: true,
    })
  })
}

/**
 * Render the React application to the DOM.
 * Uses React.StrictMode for additional development checks.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
