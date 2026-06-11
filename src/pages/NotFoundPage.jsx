import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', marginTop: '4rem', fontFamily: 'sans-serif' }}>
      <h2>404 — Page Not Found</h2>
      <p>That page does not exist.</p>
      <Link to="/">Back to Dashboard</Link>
    </div>
  )
}