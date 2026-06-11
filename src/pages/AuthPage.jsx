import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'


const API = 'http://localhost:8000'

export default function AuthPage() {
  
  const {login} = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState('login')
  const [form, setForm] = useState({ email: '', password: '' })
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleRegister(e) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ text: data.detail || 'Registration failed', color: 'red' })
        return
      }
      setMessage({ text: `Registered as ${data.email}! Now log in.`, color: 'green' })
      setView('login')
    } catch {
      setMessage({ text: 'Cannot reach backend.', color: 'red' })
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      const body = new URLSearchParams()
      body.append('username', form.email)
      body.append('password', form.password)

      const res = await fetch(`${API}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ text: data.detail || 'Login failed', color: 'red' })
        return
      }
      login(data.access_token)
      navigate('/')
    } catch {
      setMessage({ text: 'Cannot reach backend.', color: 'red' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h2>Job Application Portal</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        {['login', 'register'].map((v) => (
          <button
            key={v}
            onClick={() => { setView(v); setMessage(null) }}
            style={{
              ...styles.tabBtn,
              background: view === v ? '#333' : '#eee',
              color: view === v ? '#fff' : '#333',
            }}
          >
            {v === 'login' ? 'Login' : 'Register'}
          </button>
        ))}
      </div>

      {message && (
        <div style={{ color: message.color, marginBottom: '0.75rem', fontSize: 14 }}>
          {message.text}
        </div>
      )}

      <form onSubmit={view === 'login' ? handleLogin : handleRegister} style={styles.form}>
        <label style={styles.label}>
          Email
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </label>

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? '...' : view === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: 400,
    margin: '3rem auto',
    fontFamily: 'sans-serif',
    padding: '0 1rem',
  },
  tabBtn: {
    padding: '0.4rem 1rem',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 14,
  },
  input: {
    padding: '0.4rem',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: 4,
  },
  submitBtn: {
    padding: '0.6rem',
    cursor: 'pointer',
    background: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 14,
  },
}
