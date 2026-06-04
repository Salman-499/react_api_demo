import { useState } from 'react'

const API_URL = 'http://localhost:8000'

export default function JobApplicationForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    age: '',
    years_experience: '',
    cover_letter: '',
  })
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setResponse(null)
    setLoading(true)

    const payload = {
      name: form.name,
      email: form.email,
      age: Number(form.age),
      years_experience: Number(form.years_experience),
      cover_letter: form.cover_letter || null,
    }

    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.detail?.[0]?.msg || `Server error: ${res.status}`)
        return
      }

      const data = await res.json()
      setResponse(data)
      setForm({ name: '', email: '', age: '', years_experience: '', cover_letter: '' })
    } catch {
      setError('Could not reach the backend. Is it running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h2>Job Application</h2>

      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
      )}

      {response && (
        <div style={{ color: 'green', marginBottom: '1rem' }}>
          <strong>Application submitted!</strong>
          <pre style={{ fontSize: 13 }}>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label>
          Name
          <input name="name" value={form.name} onChange={handleChange} style={inputStyle} />
        </label>

        <label>
          Email   <hr />
          <input name="email" value={form.email} onChange={handleChange} style={inputStyle} />
        </label>

        <label>
          Age
          <input name="age" type="number" value={form.age} onChange={handleChange} style={inputStyle} />
        </label>

        <label>
          Years of experience
          <input name="years_experience" type="number" value={form.years_experience} onChange={handleChange} style={inputStyle} />
        </label>

        <label>
          Cover letter (optional)
          <textarea name="cover_letter" value={form.cover_letter} onChange={handleChange} rows={4} style={inputStyle} />
        </label>

        <button type="submit" disabled={loading} style={{ padding: '0.6rem', cursor: 'pointer' }}>
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  )
}

const inputStyle = {
  display: 'block',
  width: '100%',
  marginTop: '0.25rem',
  padding: '0.4rem',
  boxSizing: 'border-box',
}
