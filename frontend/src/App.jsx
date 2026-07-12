import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'

const AUTH_STORAGE_KEY = 'assetflow-auth'

const ROLE_ROUTES = {
  admin: {
    path: '/admin/dashboard',
    label: 'Admin Dashboard',
    apiPath: '/api/dashboard/admin',
  },
  asset_manager: {
    path: '/asset-manager/dashboard',
    label: 'Asset Manager Dashboard',
    apiPath: '/api/dashboard/asset-manager',
  },
  department_head: {
    path: '/department-head/dashboard',
    label: 'Department Head Dashboard',
    apiPath: '/api/dashboard/department-head',
  },
  employee: {
    path: '/employee/dashboard',
    label: 'Employee Dashboard',
    apiPath: '/api/dashboard/employee',
  },
}

function roleToRoute(role) {
  return ROLE_ROUTES[role]?.path ?? '/'
}

function roleToLabel(role) {
  return ROLE_ROUTES[role]?.label ?? 'Dashboard'
}

function getStoredAuth() {
  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue)
  } catch {
    return null
  }
}

function saveAuth(session) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

function clearAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

async function apiRequest(path, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(path, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message ?? 'Request failed')
  }

  return data
}

function LoginPage({ session, onLogin }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@assetflow.local')
  const [password, setPassword] = useState('ChangeMe123!')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (session?.user?.role) {
      navigate(roleToRoute(session.user.role), { replace: true })
    }
  }, [navigate, session])

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      onLogin(data)
      navigate(roleToRoute(data.user.role), { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <h1>AssetFlow Login</h1>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Email
            <br />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
        </p>
        <p>
          <label>
            Password
            <br />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
        </p>
        {error ? <p>{error}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <section>
        <h2>Dashboard routes</h2>
        <ul>
          <li><Link to="/admin/dashboard">Admin</Link></li>
          <li><Link to="/asset-manager/dashboard">Asset Manager</Link></li>
          <li><Link to="/department-head/dashboard">Department Head</Link></li>
          <li><Link to="/employee/dashboard">Employee</Link></li>
        </ul>
      </section>
      <p>
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
    </main>
  )
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')

    try {
      const data = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })

      setMessage(data.message)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <h1>Forgot Password</h1>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Email
            <br />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
        </p>
        {error ? <p>{error}</p> : null}
        {message ? <p>{message}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? 'Sending...' : 'Send reset email'}
        </button>
      </form>
      <p>
        <Link to="/">Back to login</Link>
      </p>
    </main>
  )
}

function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [token] = useState(searchParams.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [linkExpired, setLinkExpired] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    setLinkExpired(false)

    if (!token) {
      setLinkExpired(true)
      setBusy(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setBusy(false)
      return
    }

    try {
      const data = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, token, password }),
      })

      setMessage(data.message)
    } catch (requestError) {
      if (requestError.message === 'Invalid or expired reset token') {
        setLinkExpired(true)
        setError('')
      } else {
        setError(requestError.message)
      }
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <main>
        <h1>Reset Password</h1>
        <p>The reset link is missing or has expired.</p>
        <p>
          <Link to="/forgot-password">Request a new reset link</Link>
        </p>
      </main>
    )
  }

  return (
    <main>
      <h1>Reset Password</h1>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Email
            <br />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
        </p>
        <p>
          <label>
            New Password
            <br />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
        </p>
        <p>
          <label>
            Confirm Password
            <br />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
        </p>
        {linkExpired ? <p>The reset link is missing, invalid, or expired.</p> : null}
        {error ? <p>{error}</p> : null}
        {message ? <p>{message}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
      <p>
        <Link to="/">Back to login</Link>
      </p>
    </main>
  )
}

function DashboardPage({ session, onLogout, role }) {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session?.token) {
      return
    }

    if (session.user.role !== role) {
      navigate(roleToRoute(session.user.role), { replace: true })
      return
    }

    let cancelled = false

    async function loadDashboard() {
      setError('')

      try {
        const data = await apiRequest(ROLE_ROUTES[role].apiPath, {}, session.token)

        if (!cancelled) {
          setDashboardData(data)
        }
      } catch (requestError) {
        if (!cancelled) {
          if (requestError.message === 'Unauthorized' || requestError.message === 'Invalid or expired token') {
            onLogout()
            navigate('/', { replace: true })
            return
          }

          setError(requestError.message)
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [navigate, onLogout, role, session])

  if (!session?.token) {
    return <Navigate to="/" replace />
  }

  if (session.user.role !== role) {
    return <Navigate to={roleToRoute(session.user.role)} replace />
  }

  return (
    <main>
      <header>
        <h1>{roleToLabel(role)}</h1>
        <p>{session.user.name}</p>
        <p>{session.user.email}</p>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </header>
      <nav>
        <p>Routes</p>
        <ul>
          <li><Link to="/admin/dashboard">Admin Dashboard</Link></li>
          <li><Link to="/asset-manager/dashboard">Asset Manager Dashboard</Link></li>
          <li><Link to="/department-head/dashboard">Department Head Dashboard</Link></li>
          <li><Link to="/employee/dashboard">Employee Dashboard</Link></li>
        </ul>
      </nav>
      <section>
        <h2>Protected data</h2>
        {error ? <p>{error}</p> : null}
        {dashboardData ? <pre>{JSON.stringify(dashboardData, null, 2)}</pre> : <p>Loading...</p>}
      </section>
    </main>
  )
}

function DashboardRedirect({ session }) {
  if (!session?.user?.role) {
    return <Navigate to="/" replace />
  }

  return <Navigate to={roleToRoute(session.user.role)} replace />
}

function AppRoutes({ session, onLogin, onLogout }) {
  return (
    <Routes>
      <Route path="/" element={<LoginPage session={session} onLogin={onLogin} />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/dashboard" element={<DashboardRedirect session={session} />} />
      <Route path="/admin/dashboard" element={<DashboardPage session={session} onLogout={onLogout} role="admin" />} />
      <Route path="/asset-manager/dashboard" element={<DashboardPage session={session} onLogout={onLogout} role="asset_manager" />} />
      <Route path="/department-head/dashboard" element={<DashboardPage session={session} onLogout={onLogout} role="department_head" />} />
      <Route path="/employee/dashboard" element={<DashboardPage session={session} onLogout={onLogout} role="employee" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const storedSession = getStoredAuth()

    async function restoreSession() {
      if (!storedSession?.token) {
        setBooting(false)
        return
      }

      try {
        const data = await apiRequest('/api/auth/me', {}, storedSession.token)
        setSession({ token: storedSession.token, user: data.user })
      } catch {
        clearAuth()
        setSession(null)
      } finally {
        setBooting(false)
      }
    }

    restoreSession()
  }, [])

  function handleLogin(data) {
    const nextSession = {
      token: data.token,
      user: data.user,
    }

    saveAuth(nextSession)
    setSession(nextSession)
  }

  function handleLogout() {
    clearAuth()
    setSession(null)
  }

  if (booting) {
    return <main><p>Loading...</p></main>
  }

  return (
    <BrowserRouter>
      <AppRoutes session={session} onLogin={handleLogin} onLogout={handleLogout} />
    </BrowserRouter>
  )
}

export default App