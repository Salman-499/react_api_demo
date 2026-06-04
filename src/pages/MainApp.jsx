import { useState, useEffect } from 'react'

const API = 'http://localhost:8000'

export default function MainApp({ token, onLogout }) {
  const [user, setUser] = useState(null)
  const [applications, setApplications] = useState([])
  const [form, setForm] = useState({ name: '', email: '', years_experience: '' })
  const [message, setMessage] = useState(null)

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  useEffect(() => {
    fetch(`${API}/me`, { headers: authHeaders })
      .then((r) => {
        if (r.status === 401) { onLogout(); return null }
        return r.json()
      })
      .then((data) => { if (data) setUser(data) })
  }, [])

  useEffect(() => {
    fetch(`${API}/applications`, { headers: authHeaders })
      .then((r) => r.json())
      .then(setApplications)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)

    const res = await fetch(`${API}/applications`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        ...form,
        years_experience: Number(form.years_experience),
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setMessage({ text: data.detail || 'Submission failed', color: 'red' })
      return
    }

    setMessage({ text: 'Application submitted!', color: 'green' })
    setApplications((prev) => [...prev, data])
    setForm({ name: '', email: '', years_experience: '' })
  }

  return (
    <div style={styles.container}>

      <div style={styles.header}>
        {user ? (
          <div>
            <strong>{user.email}</strong>
            <span style={{
              marginLeft: 8,
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              background: user.role === 'admin' ? '#e74c3c' : '#3498db',
              color: '#fff',
            }}>
              {user.role}
            </span>
          </div>
        ) : (
          <span>Loading...</span>
        )}
        <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
      </div>

      <h3>Submit Application</h3>

      {message && (
        <div style={{ color: message.color, marginBottom: '0.5rem', fontSize: 14 }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          placeholder="Your name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          style={styles.input}
        />
        <input
          placeholder="Your email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          style={styles.input}
        />
        <input
          placeholder="Years of experience"
          type="number"
          min={0}
          value={form.years_experience}
          onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.submitBtn}>Submit Application</button>
      </form>

      {applications.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4>My Applications ({applications.length})</h4>
          {applications.map((a) => (
            <div key={a.id} style={styles.appCard}>
              <strong>{a.name}</strong> — {a.email} — {a.years_experience} yrs
              <span style={{ float: 'right', fontSize: 12, color: '#888' }}>{a.status}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

const styles = {
  container: {
    maxWidth: 500,
    margin: '2rem auto',
    fontFamily: 'sans-serif',
    padding: '0 1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    padding: '0.75rem',
    background: '#f0f0f0',
    borderRadius: 4,
  },
  logoutBtn: {
    padding: '0.3rem 0.75rem',
    cursor: 'pointer',
    background: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
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
    background: '#2ecc71',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 14,
  },
  appCard: {
    border: '1px solid #ddd',
    padding: '0.5rem 0.75rem',
    borderRadius: 4,
    marginBottom: 4,
    fontSize: 14,
  },
}
