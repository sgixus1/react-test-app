import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>✅ Gen's React Deployment Test</h1>
      <h2>React App Hosted on GitHub Pages</h2>
      
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          Count: {count}
        </button>
        <p>
          This React app is deployed via GitHub Pages.
        </p>
        <p>
          <strong>Features:</strong>
        </p>
        <ul>
          <li>React 19 + Vite</li>
          <li>GitHub Pages hosting</li>
          <li>Interactive components</li>
          <li>Global accessibility</li>
        </ul>
      </div>
      
      <div className="card">
        <h3>Next Steps</h3>
        <ol>
          <li>Database integration</li>
          <li>User authentication</li>
          <li>Payment processing</li>
          <li>Full-stack deployment</li>
        </ol>
      </div>
      
      <p className="read-the-docs">
        Deployment verified: {new Date().toLocaleDateString()}
      </p>
    </>
  )
}

export default App
