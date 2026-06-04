import { useState } from 'react'

export default function AddPost() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  let url = "https://jsonplaceholder.typicode.com/posts"
  // ← Slide 130: Form submission
  function handleSubmit(e) {
    e.preventDefault() // Don't reload the page

    // ← Slide 131: Basic validation
    if (title.trim().length < 5) {
      setError('Title must be at least 5 characters')
      return
    }
    if (body.trim().length < 10) {
      setError('Body must be at least 10 characters')
      return
    }

    setError(null)
    setLoading(true)

    // Send to backend (FastAPI will create this endpoint)
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, userId: 1 })
    })
      .then(res => {
       
       if (!res.ok) {
          throw new Error('Failed to create post')
        }
       return res.json()
      })
      .then(data => {
        console.log('Post created:', data)
        setTitle('')
        setBody('')
        alert('Post created!')
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add a New Post</h2>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div>
        <label>Title:</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Post title"
        />
      </div>

      <div>
        <label>Body:</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Post content"
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  )
}
