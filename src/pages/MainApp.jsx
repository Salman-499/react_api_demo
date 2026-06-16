import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:8000'

export default function MainApp() {
  const { token, logout } = useAuth()
  const [user, setUser] = useState(null)
  const [applications, setApplications] = useState([])
  const [form, setForm] = useState({
    name: '',
    email: '',
    years_experience: '',
    cover_letter: '',
  })
  const [message, setMessage] = useState(null)

  // AI Ask state
  const [question, setQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  useEffect(() => {
    fetch(`${API}/me`, { headers: authHeaders })
      .then((r) => {
        if (r.status === 401) { logout(); return null }
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
        cover_letter: form.cover_letter || null,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setMessage({ text: data.detail || 'Submission failed', color: 'red' })
      return
    }

    setMessage({ text: 'Application submitted!', color: 'green' })
    setApplications((prev) => [...prev, data])
    setForm({ name: '', email: '', years_experience: '', cover_letter: '' })
  }

  async function handleAsk(e) {
    e.preventDefault()
    if (!question.trim()) return
    setAiLoading(true)
    setAiAnswer(null)
    setAiError(null)

    try {
      const res = await fetch(`${API}/ask`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiError(data.detail || 'Something went wrong')
      } else {
        setAiAnswer(data.answer)
      }
    } catch {
      setAiError('Could not reach the server')
    } finally {
      setAiLoading(false)
    }
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
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </div>

      {/* ── Application form ── */}
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
        <textarea
          placeholder="Cover letter (optional — but makes the AI demo more interesting!)"
          value={form.cover_letter}
          onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
          rows={4}
          style={{ ...styles.input, resize: 'vertical', fontFamily: 'sans-serif' }}
        />
        <button type="submit" style={styles.submitBtn}>Submit Application</button>
      </form>

      {/* ── Applications list ── */}
      {applications.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4>My Applications ({applications.length})</h4>
          {applications.map((a) => (
            <div key={a.id} style={styles.appCard}>
              <strong>{a.name}</strong> — {a.email} — {a.years_experience} yrs
              <span style={{ float: 'right', fontSize: 12, color: '#888' }}>{a.status}</span>
              {a.cover_letter && (
                <div style={{ marginTop: 4, fontSize: 12, color: '#555', fontStyle: 'italic' }}>
                  {a.cover_letter.slice(0, 120)}{a.cover_letter.length > 120 ? '…' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Ask AI (RAG demo) ── */}
      <div style={styles.aiPanel}>
        <div style={styles.aiPanelHeader}>
          <span style={styles.aiBadge}>AI</span>
          <strong>Ask about your applications</strong>
        </div>
        <p style={styles.aiSubtext}>
          Powered by LangChain RAG — your applications are loaded, split, embedded, and searched on every query.
        </p>
        <form onSubmit={handleAsk} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            placeholder='e.g. "Who has the most experience?" or "Which applications are pending?"'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{ ...styles.input, flex: 1, margin: 0 }}
          />
          <button
            type="submit"
            disabled={aiLoading}
            style={{ ...styles.askBtn, opacity: aiLoading ? 0.6 : 1 }}
          >
            {aiLoading ? '...' : 'Ask'}
          </button>
        </form>

        {aiLoading && (
          <div style={styles.aiLoading}>
            Running RAG pipeline: loading → splitting → embedding → retrieving → generating...
          </div>
        )}

        {aiError && (
          <div style={{ ...styles.aiResponse, borderColor: '#e74c3c', color: '#e74c3c' }}>
            {aiError}
          </div>
        )}

        {aiAnswer && (
          <div style={styles.aiResponse}>
            {aiAnswer}
          </div>
        )}
      </div>

    </div>
  )
}

const styles = {
  container: {
    maxWidth: 560,
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
    fontSize: '0.95rem',
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
  aiPanel: {
    marginTop: '2rem',
    border: '1px solid #a29bfe',
    borderRadius: 6,
    padding: '1rem',
    background: '#faf9ff',
  },
  aiPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  aiBadge: {
    background: '#6c5ce7',
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: 10,
  },
  aiSubtext: {
    fontSize: 12,
    color: '#888',
    margin: '0 0 0.75rem 0',
  },
  askBtn: {
    padding: '0.4rem 1rem',
    cursor: 'pointer',
    background: '#6c5ce7',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  aiLoading: {
    marginTop: '0.75rem',
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  aiResponse: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    background: '#fff',
    border: '1px solid #dfe6e9',
    borderRadius: 4,
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
}
