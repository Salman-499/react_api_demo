import { useState } from 'react'
import AuthPage from './pages/AuthPage'
import MainApp from './pages/MainApp'

// Slides 104-170: Auth demo
// To restore the original job application demo, swap this import:
//   import Home from './pages/Home'
//   export default function App() { return <Home /> }

function App() {
  const [token, setToken] = useState(localStorage.getItem('auth_token'))

  if (!token) {
    return (
      <AuthPage
        onLogin={(t) => {
          localStorage.setItem('auth_token', t)
          setToken(t)
        }}
      />
    )
  }

  return (
    <MainApp
      token={token}
      onLogout={() => {
        localStorage.removeItem('auth_token')
        setToken(null)
      }}
    />
  )
}

export default App
