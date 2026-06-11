# Context API and React Router

Two patterns that appear in almost every production React app. Context eliminates prop drilling. React Router gives your app real URLs.

---

## Why Context? The Prop Drilling Problem

Without context, shared state lives in the nearest common ancestor and gets passed down as props:

```
App  (owns token)
 ├── AuthPage  ← receives onLogin as prop
 └── MainApp   ← receives token + onLogout as props
```

Add a Navbar, a Settings page, and a UserProfile — every one of them needs the token. Every one needs to be wired up manually through props. This is **prop drilling**.

Context is a broadcast channel. You publish state once at the top; any component can subscribe without intermediaries:

```
AuthProvider  (owns token)
    ├── AuthPage    ← calls useAuth()
    ├── MainApp     ← calls useAuth()
    ├── Navbar      ← calls useAuth()
    └── Anything    ← calls useAuth()
```

---

## Creating AuthContext

Create `src/context/AuthContext.jsx`:

```jsx
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('auth_token'))

  function login(t) {
    localStorage.setItem('auth_token', t)
    setToken(t)
  }

  function logout() {
    localStorage.removeItem('auth_token')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
```

### What each part does

**`createContext(null)`** — creates the channel. `null` is the default value when there is no provider above the component in the tree. The guard in `useAuth` turns this into an explicit error instead of a silent `undefined` bug.

**`AuthContext.Provider value={...}`** — whatever object you pass to `value` is what every consumer receives when they call `useContext(AuthContext)`.

**`useAuth()`** — a custom hook that wraps `useContext`. Consumers import `useAuth` instead of `AuthContext` directly. One clean import, no need to know the internal context object.

---

## Wiring Up the Provider

### App.jsx

Wrap the app in `AuthProvider` and read the token through `useAuth`:

```jsx
import { useAuth, AuthProvider } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import MainApp from './pages/MainApp'

function AppContent() {
  const { token } = useAuth()
  if (!token) return <AuthPage />
  return <MainApp />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
```

`App` is now a layout shell. It no longer holds state.

### AuthPage

```jsx
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { login } = useAuth()
  // ...
  // Replace: onLogin(data.access_token)
  login(data.access_token)
}
```

### MainApp

```jsx
import { useAuth } from '../context/AuthContext'

export default function MainApp() {
  const { token, logout } = useAuth()
  // ...
  // Replace: onClick={onLogout}
  // With:    onClick={logout}
}
```

Both components no longer receive props from App. They subscribe directly.

---

## Local State vs Context: The Decision

Not all state belongs in context. The rule:

```
Question: Does any OTHER component need this right now?

form fields        → No. Only this form uses them.          → Stay local
message / toast    → No. Only this component shows it.      → Stay local
token              → Yes. Multiple components need it.       → Context
current user       → Maybe. Navbar might display email.     → Context candidate
```

**Why this matters:** Context re-renders every consumer when its value changes. Form field state that updates on every keystroke would trigger re-renders across the entire app. Keep per-component, temporary, or private state local with `useState`.

```
Good fit for context:  auth token, current user, theme, cart, language
Bad fit for context:   form fields, hover state, local toggle, scroll position
```

---

## useReducer: Worth Knowing

`useReducer` is an alternative to `useState` for managing state that has multiple related pieces or transitions with rules. Instead of several separate `setState` calls, you dispatch named actions (`LOGIN_SUCCESS`, `LOGOUT`) and a reducer function decides the resulting state. It is the concept behind Redux and Zustand. We are not covering it in this lecture, but you will see it in production codebases.

---

## React Router: Real URL-Based Navigation

Conditional rendering works for two views, but the URL never changes. You cannot link someone directly to a page, the back button does nothing, and there is no concept of "where am I."

React Router gives each view a URL. Install it:

```bash
npm install react-router-dom
```

The target route structure:

```
/login               → AuthPage            (public)
/                    → MainApp             (protected, needs token)
/applications/:id    → ApplicationDetail   (protected)
*                    → NotFoundPage
```

### Wiring up BrowserRouter and Routes

Replace `src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import MainApp from './pages/MainApp'
import NotFoundPage from './pages/NotFoundPage'

function ProtectedRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
```

### What each part does

**`BrowserRouter`** — wraps the whole app and enables URL-based routing using the browser's History API. Must be the outermost wrapper.

**`Routes`** — looks at the current URL and renders the first `Route` whose `path` matches.

**`ProtectedRoute`** — checks for a token before rendering children. No token → redirect to `/login`. The pattern: check auth, decide, redirect or render.

**`path="*"`** — the wildcard catch-all. Only matches when no other route does. Always put it last.

**`<Navigate replace />`** — redirects without adding an entry to the browser history stack, so the back button does not loop the user back to a protected page.

---

## Navigating After Login

Import `useNavigate` in `AuthPage.jsx` and navigate after a successful login:

```jsx
import { useNavigate } from 'react-router-dom'

export default function AuthPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  // inside handleLogin, after login(data.access_token):
  login(data.access_token)
  navigate('/')
}
```

`useNavigate` is for programmatic navigation — form submissions, logouts, post-API-call redirects. Use `<Link>` and `<NavLink>` for user-initiated navigation in JSX.

---

## Dynamic Routes with useParams

Add an application detail page reachable at `/applications/:id`:

```jsx
// App.jsx — add inside Routes
<Route
  path="/applications/:id"
  element={
    <ProtectedRoute>
      <ApplicationDetailPage />
    </ProtectedRoute>
  }
/>
```

Create `src/pages/ApplicationDetailPage.jsx`:

```jsx
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'

const API = 'http://localhost:8000'

export default function ApplicationDetailPage() {
  const { id } = useParams()          // reads ":id" segment from the URL
  const { token } = useAuth()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API}/applications/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => { setApplication(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [id])   // re-runs if the user navigates from /applications/1 to /applications/2

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  if (error || !application) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Application not found.</p>
        <Link to="/">← Back to Dashboard</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <Link to="/">← Back to Dashboard</Link>
      <h2 style={{ marginTop: '1rem' }}>{application.name}</h2>
      <p>{application.email}</p>
      <p>{application.years_experience} years experience</p>
      <p>Status: <strong>{application.status}</strong></p>
    </div>
  )
}
```

> **Note:** `useParams()` always returns strings. For `/applications/3`, `id === "3"` — never the number `3`. When comparing with a numeric backend ID, use `application.id === Number(id)` or `String(application.id) === id`.

Add links from the application list in `MainApp.jsx`:

```jsx
import { Link } from 'react-router-dom'

// inside applications.map():
<div key={a.id} style={styles.appCard}>
  <strong>{a.name}</strong> — {a.email} — {a.years_experience} yrs
  <span style={{ float: 'right', fontSize: 12, color: '#888' }}>{a.status}</span>
  <div>
    <Link to={`/applications/${a.id}`} style={{ fontSize: 12 }}>View Details</Link>
  </div>
</div>
```

---

## 404 Handling

Create `src/pages/NotFoundPage.jsx`:

```jsx
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
```

The wildcard route in `App.jsx`:

```jsx
<Route path="*" element={<NotFoundPage />} />
```

React Router tries routes top to bottom. If nothing matches, it falls through to `*`. Keep `NotFoundPage` outside the shell route so the user gets a clear signal they are genuinely lost, not redirected.

---

## The Full Architecture

```
BrowserRouter
  AuthProvider  (token, login, logout — via context)
    Routes
      /login                → AuthPage           (public)
      [ProtectedRoute]
        /                   → MainApp            (protected)
        /applications/:id   → ApplicationDetail  (protected)
      *                     → NotFoundPage
```

Two concerns at the right layer:
- **Context** owns auth state — no prop drilling
- **Router** owns navigation — real URLs, back button, linkable pages

---

## Common Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `useAuth must be used inside AuthProvider` | Component calling `useAuth()` is outside the provider in the tree | Ensure `AuthProvider` wraps every component that calls `useAuth()` in `App.jsx` |
| `useNavigate` crash inside AuthProvider | `AuthProvider` is outside `BrowserRouter` | Keep `BrowserRouter` as the outermost wrapper |
| Route params are numbers but comparison fails | `params.id` is always a string | Use `Number(id)` or `String(application.id)` for comparison |
