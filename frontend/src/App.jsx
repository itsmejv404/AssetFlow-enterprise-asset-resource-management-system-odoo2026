import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { DepartmentsTab } from './components/DepartmentsTab'
import { CategoriesTab } from './components/CategoriesTab'
import { EmployeesTab } from './components/EmployeesTab'
import { AssetsTab } from './components/AssetsTab'
import { AllocationsTab } from './components/AllocationsTab'
import { MaintenanceTab } from './components/MaintenanceTab'
import { AuditsTab } from './components/AuditsTab'
import { LogsTab } from './components/LogsTab'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { Skeleton } from './components/ui/skeleton'
import { apiRequest } from './lib/api'
import { clearAuth, getStoredAuth, ROLE_ROUTES, roleToLabel, roleToRoute, saveAuth } from './lib/auth'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark')
  })

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="rounded-full"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-violet-700" />
      )}
    </Button>
  )
}

function AppShell({ title, eyebrow = 'AssetFlow', session, onLogout, navItems = [], activeTab, onTabChange, children, hubLink = true }) {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="top-nav-brand" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/assetflowLogo.png" alt="AssetFlow Logo" style={{ height: '2.25rem', width: 'auto', objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="top-nav-eyebrow">{eyebrow}</span>
            <h1 className="top-nav-title">{title}</h1>
          </div>
        </div>
        <div className="top-nav-user">
          <div className="top-nav-user-info hidden sm:flex">
            <p className="top-nav-user-name">{session.user.name}</p>
            <p className="top-nav-user-email">{session.user.email}</p>
          </div>
          <ThemeToggle />
          <Button type="button" variant="outline" size="sm" onClick={onLogout}>Sign out</Button>
        </div>
      </header>

      <div className="shell-layout">
        <aside className="shell-sidebar">
          <div className="shell-sidebar-workspace">
            <span className="shell-sidebar-workspace-label">Workspace</span>
            <span className="shell-sidebar-workspace-role">{roleToLabel(session.user.role)}</span>
          </div>

          <nav aria-label="Dashboard navigation">
            <ul className="nav-list">
              {navItems.map((item) => (
                <li key={item.value}>
                  <Button
                    type="button"
                    variant={activeTab === item.value ? 'default' : 'ghost'}
                    onClick={() => onTabChange(item.value)}
                  >
                    {item.label}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>

          {hubLink ? (
            <div className="hub-link-section">
              {/* <Link to="/dashboard">← Dashboard hub</Link> */}
            </div>
          ) : null}
        </aside>

        <main className="shell-content">
          <div className="page-stack">{children}</div>
        </main>
      </div>
    </div>
  )
}

function StatusMessage({ type, children }) {
  if (!children) return null
  return <p className={type === 'error' ? 'status-error' : 'status-success'}>{children}</p>
}

function formatStatus(status) {
  if (!status) return '—'
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}



function ReportsView({ token, categories, departments }) {
  const [reportType, setReportType] = useState('assets')
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categoryId: '',
    departmentId: '',
    location: '',
    status: ''
  })
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [error, setError] = useState('')

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const runReport = async () => {
    setLoading(true)
    setError('')
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, val]) => {
        if (val) queryParams.append(key, val)
      })
      
      const endpoint = `/api/admin/reports/${reportType}?${queryParams.toString()}`
      const data = await apiRequest(endpoint, {}, token)
      setReportData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType])

  const getRows = () => {
    if (!reportData) return []
    let raw = []
    if (reportType === 'assets') raw = reportData.assets || []
    else if (reportType === 'maintenance') raw = reportData.requests || []
    else raw = Array.isArray(reportData) ? reportData : []

    return raw.map(item => {
      if (reportType === 'assets') {
        return {
          ID: item.id,
          Name: item.name,
          Tag: item.assetTag,
          Serial: item.serialNumber || '—',
          Status: formatStatus(item.status),
          Condition: item.condition || '—',
          Location: item.location || '—',
          Category: item.category?.name || '—',
          Holder: item.currentHolderEmployee?.name || item.currentHolderDepartment?.name || '—'
        }
      }
      if (reportType === 'maintenance') {
        return {
          ID: item.id,
          Asset: item.asset?.name || '—',
          RaisedBy: item.raisedBy?.name || '—',
          Description: item.issueDescription,
          Priority: formatStatus(item.priority),
          Status: formatStatus(item.status),
          Cost: item.cost ? `$${item.cost}` : '—',
          Downtime: item.actualDowntime ? `${item.actualDowntime} hours` : '—',
          Notes: item.resolutionNotes || '—'
        }
      }
      if (reportType === 'bookings') {
        return {
          ID: item.id,
          Resource: item.resource?.name || '—',
          BookedBy: item.bookedBy?.name || '—',
          Start: new Date(item.startTime).toLocaleString(),
          End: new Date(item.endTime).toLocaleString(),
          Status: formatStatus(item.status)
        }
      }
      return item
    })
  }

  const exportToCSV = () => {
    const rows = getRows()
    if (rows.length === 0) return

    const headers = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object')
    const csvRows = []
    csvRows.push(headers.join(','))

    rows.forEach(row => {
      const values = headers.map(header => {
        const val = row[header]
        const escaped = ('' + (val ?? '')).replace(/"/g, '""')
        return `"${escaped}"`
      })
      csvRows.push(values.join(','))
    })

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const rows = getRows()

  return (
    <div className="reports-section bg-white border border-violet-100 rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-violet-950 m-0">Reports & Analytics</h3>
          <p className="text-sm text-violet-500 m-0">Generate, filter and export operational logs</p>
        </div>
        {rows.length > 0 && (
          <button
            onClick={exportToCSV}
            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition"
          >
            📥 Export CSV
          </button>
        )}
      </div>

      {/* Selector and Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-violet-50/50 p-4 rounded-lg border border-violet-100">
        <label className="text-xs font-semibold text-violet-700">
          Report Category
          <select
            value={reportType}
            onChange={e => setReportType(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm"
          >
            <option value="assets">Assets Inventory & Allocation</option>
            <option value="maintenance">Maintenance Request Details</option>
            <option value="departments">Department Spending & Asset Values</option>
            <option value="bookings">Resource Booking Statistics</option>
          </select>
        </label>

        <label className="text-xs font-semibold text-violet-700">
          Start Date
          <input
            type="date"
            value={filters.startDate}
            onChange={e => handleFilterChange('startDate', e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm"
          />
        </label>

        <label className="text-xs font-semibold text-violet-700">
          End Date
          <input
            type="date"
            value={filters.endDate}
            onChange={e => handleFilterChange('endDate', e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm"
          />
        </label>

        {reportType === 'assets' && (
          <>
            <label className="text-xs font-semibold text-violet-700">
              Category
              <select
                value={filters.categoryId}
                onChange={e => handleFilterChange('categoryId', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-violet-700">
              Location
              <input
                type="text"
                placeholder="e.g. Headquarters"
                value={filters.location}
                onChange={e => handleFilterChange('location', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-violet-700">
              Status
              <select
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm"
              >
                <option value="">All Statuses</option>
                <option value="available">Available</option>
                <option value="allocated">Allocated</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="retired">Retired</option>
                <option value="disposed">Disposed</option>
              </select>
            </label>
          </>
        )}

        {reportType === 'maintenance' && (
          <label className="text-xs font-semibold text-violet-700">
            Priority
            <select
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
        )}
      </div>

      <div className="flex justify-end gap-2 mb-6">
        <button
          onClick={() => {
            setFilters({ startDate: '', endDate: '', categoryId: '', departmentId: '', location: '', status: '' })
            setReportData(null)
          }}
          className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold py-2 px-4 rounded-lg text-sm transition"
        >
          Reset Filters
        </button>
        <button
          onClick={runReport}
          className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-6 rounded-lg text-sm transition"
        >
          {loading ? 'Running...' : 'Generate Report'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm font-semibold mb-4">Error: {error}</p>}

      {/* Metrics Row */}
      {reportData && reportData.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(reportData.metrics).map(([key, val]) => (
            <div key={key} className="bg-violet-50/50 border border-violet-100 p-3 rounded-lg text-center shadow-xs">
              <span className="block text-[11px] font-semibold text-violet-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              <span className="block text-lg font-bold text-violet-950 mt-1">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Report Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <p className="text-center text-sm text-violet-600 font-medium py-8">Fetching report metrics...</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-neutral-500 py-8">No records match the current reporting filter.</p>
        ) : (
          <table>
            <thead>
              <tr>
                {Object.keys(rows[0]).map(header => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {Object.keys(row).map(header => (
                    <td key={header}>{'' + (row[header] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function BookingCalendar({ bookings, onSelectTimeSlot }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonthDays = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    prevMonthDays.push(null)
  }

  const currentMonthDays = []
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push(new Date(year, month, i))
  }

  const calendarDays = [...prevMonthDays, ...currentMonthDays]

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  function getBookingsForDate(date) {
    if (!date) return []
    const dateStr = date.toDateString()
    return bookings.filter(bk => bk.status !== 'cancelled' && new Date(bk.startTime).toDateString() === dateStr)
  }

  return (
    <div className="booking-calendar mt-5 rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-violet-950 m-0">{monthNames[month]} {year}</h4>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary py-1 px-3 text-xs" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>Prev</button>
          <button type="button" className="btn btn-secondary py-1 px-3 text-xs" onClick={() => setCurrentDate(new Date())}>Today</button>
          <button type="button" className="btn btn-secondary py-1 px-3 text-xs" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>Next</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center font-semibold text-violet-600 text-xs mb-2">
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-24 bg-neutral-50 rounded-lg opacity-45"></div>
          }

          const dayBookings = getBookingsForDate(date)
          const isToday = date.toDateString() === new Date().toDateString()

          return (
            <div
              key={`day-${date.getDate()}`}
              className="h-24 border border-neutral-100 rounded-lg p-1.5 flex flex-col justify-between overflow-hidden cursor-pointer hover:border-violet-300 transition"
              style={{ backgroundColor: isToday ? '#f5f3ff' : 'white', borderColor: isToday ? '#ddd6fe' : '#f3f4f6' }}
              onClick={() => onSelectTimeSlot(date)}
            >
              <span className="font-bold text-xs" style={{ color: isToday ? '#7c3aed' : '#374151' }}>
                {date.getDate()}
              </span>
              <div className="flex-1 overflow-y-auto mt-1 flex flex-col gap-1">
                {dayBookings.slice(0, 3).map(bk => (
                  <div key={bk.id} className="text-[9px] bg-violet-100 text-violet-900 px-1 py-0.5 rounded truncate" title={`${bk.resource?.name || 'Resource'}`}>
                    {bk.resource?.name || 'Booked'}
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-[8px] text-violet-600 font-semibold pl-1">
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LoginPage({ session, onLogin }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@assetflow.local')
  const [password, setPassword] = useState('ChangeMe123!')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <main className="auth-page" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <ThemeToggle />
      </div>
      <Card className="auth-card">
        <CardHeader className="p-0 pb-5">
          <img src="/assetflowLogo.png" alt="AssetFlow Logo" className="auth-logo" style={{ background: 'none', boxShadow: 'none', objectFit: 'contain' }} />
          <CardTitle className="text-xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-sm">Sign in to manage assets, allocations, and audits.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} style={{ border: 'none', boxShadow: 'none', padding: 0, margin: 0, background: 'transparent' }}>
            <label>
              Email address
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@company.com"
              />
            </label>
            <label>
              Password
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>
            <StatusMessage type="error">{error}</StatusMessage>
            <Button type="submit" disabled={busy} className="w-full mt-1">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-5 grid gap-3 border-t border-violet-100 pt-5 text-sm">
            <div className="flex justify-between items-center">
              <Link to="/forgot-password" className="text-violet-600 hover:text-violet-800">Forgot password?</Link>
            </div>
          </div>
        </CardContent>
      </Card>
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
    <main className="auth-page" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <ThemeToggle />
      </div>
      <Card className="auth-card">
        <CardHeader className="p-0 pb-5">
          <img src="/assetflowLogo.png" alt="AssetFlow Logo" className="auth-logo" style={{ background: 'none', boxShadow: 'none', objectFit: 'contain' }} />
          <CardTitle className="text-xl font-bold tracking-tight">Reset your password</CardTitle>
          <CardDescription>Enter your email and we&apos;ll send a reset link.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} style={{ border: 'none', boxShadow: 'none', padding: 0, margin: 0, background: 'transparent' }}>
            <label>
              Email address
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@company.com"
              />
            </label>
            <StatusMessage type="error">{error}</StatusMessage>
            <StatusMessage type="success">{message}</StatusMessage>
            <Button type="submit" disabled={busy} className="w-full mt-1">
              {busy ? 'Sending…' : 'Send reset email'}
            </Button>
          </form>
          <p className="mt-5 border-t border-violet-100 pt-5 text-sm">
            <Link to="/" className="text-violet-600 hover:text-violet-800">← Back to login</Link>
          </p>
        </CardContent>
      </Card>
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

function AdminDashboardView({ session, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [dashboardData, setDashboardData] = useState(null)
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [employees, setEmployees] = useState([])
  const [assets, setAssets] = useState([])
  const [logs, setLogs] = useState([])
  const [allocations, setAllocations] = useState([])
  const [transfers, setTransfers] = useState([])
  const [maintenanceRequests, setMaintenanceRequests] = useState([])
  const [auditCycles, setAuditCycles] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchDashboardKpis = async () => {
    try {
      const endpoint = session.user.role === 'admin' ? '/api/dashboard/admin' : '/api/dashboard/asset-manager'
      const data = await apiRequest(endpoint, {}, session.token)
      setDashboardData(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleApproveReturn = async (id) => {
    const notes = window.prompt('Enter return condition notes (optional):')
    if (notes === null) return
    const condition = window.prompt('Enter updated asset condition (e.g. Good, Fair, Damaged):', 'Good')
    if (condition === null) return

    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/allocations/${id}/return`, {
        method: 'POST',
        body: JSON.stringify({ notes, assetCondition: condition })
      }, session.token)
      setSuccess('Return approved successfully')
      fetchAllocations()
      fetchAssets()
      if (tab === 'dashboard') fetchDashboardKpis()
    } catch (err) {
      setError(err.message)
    }
  }

  const [deptForm, setDeptForm] = useState({ name: '', code: '', parentDepartmentId: '' })
  const [editingDept, setEditingDept] = useState(null)
  
  const [catForm, setCatForm] = useState({ name: '', description: '' })
  const [schemaFields, setSchemaFields] = useState([])
  const [editingCat, setEditingCat] = useState(null)

  const [empForm, setEmpForm] = useState({ name: '', email: '', departmentId: '', role: 'employee' })
  const [editingEmp, setEditingEmp] = useState(null)
  const [promotingEmp, setPromotingEmp] = useState(null)
  const [promoteRole, setPromoteRole] = useState('department_head')
  const [promoteDeptId, setPromoteDeptId] = useState('')

  const [assetForm, setAssetForm] = useState({
    name: '',
    categoryId: '',
    serialNumber: '',
    acquisitionDate: '',
    acquisitionCost: '',
    condition: '',
    location: '',
    isBookable: false
  })
  const [assetCustomFields, setAssetCustomFields] = useState({})
  const [editingAsset, setEditingAsset] = useState(null)
  const [editingAssetCustomFields, setEditingAssetCustomFields] = useState({})
  const [managingAssetDocs, setManagingAssetDocs] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)

  const [allocationForm, setAllocationForm] = useState({ assetId: '', employeeId: '', departmentId: '', expectedReturnDate: '' })
  
  const [rejectingMaintenanceId, setRejectingMaintenanceId] = useState(null)
  const [maintenanceReason, setMaintenanceReason] = useState('')
  const [assigningTechId, setAssigningTechId] = useState(null)
  const [technicianName, setTechnicianName] = useState('')

  const [auditCycleForm, setAuditCycleForm] = useState({ name: '', scopeDepartmentId: '', scopeLocation: '', startDate: '', endDate: '' })
  const [assigningAuditorsCycle, setAssigningAuditorsCycle] = useState(null)
  const [selectedAuditors, setSelectedAuditors] = useState([])

  const fetchDepartments = async () => {
    try {
      const data = await apiRequest('/api/admin/departments', {}, session.token)
      setDepartments(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await apiRequest('/api/admin/asset-categories', {}, session.token)
      setCategories(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchEmployees = async () => {
    try {
      const data = await apiRequest('/api/admin/employees', {}, session.token)
      setEmployees(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAssets = async () => {
    try {
      const data = await apiRequest('/api/admin/assets', {}, session.token)
      setAssets(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchLogs = async () => {
    try {
      const data = await apiRequest('/api/admin/logs', {}, session.token)
      setLogs(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAllocations = async () => {
    try {
      const data = await apiRequest('/api/admin/allocations', {}, session.token)
      setAllocations(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchTransfers = async () => {
    try {
      const data = await apiRequest('/api/admin/transfers', {}, session.token)
      setTransfers(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchMaintenanceRequests = async () => {
    try {
      const data = await apiRequest('/api/admin/maintenance-requests', {}, session.token)
      setMaintenanceRequests(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAuditCycles = async () => {
    try {
      const data = await apiRequest('/api/admin/audit-cycles', {}, session.token)
      setAuditCycles(data)
    } catch (err) {
      setError(err.message)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setError('')
    setSuccess('')
    setEditingDept(null)
    setEditingCat(null)
    setEditingEmp(null)
    setPromotingEmp(null)
    setEditingAsset(null)
    setManagingAssetDocs(null)
    setRejectingMaintenanceId(null)
    setMaintenanceReason('')
    setAssigningTechId(null)
    setTechnicianName('')
    setAssigningAuditorsCycle(null)
    setSelectedAuditors([])

    if (tab === 'dashboard') {
      fetchDashboardKpis()
    } else if (tab === 'departments') {
      fetchDepartments()
    } else if (tab === 'categories') {
      fetchCategories()
    } else if (tab === 'employees') {
      fetchEmployees()
      fetchDepartments()
    } else if (tab === 'assets') {
      fetchAssets()
      fetchCategories()
    } else if (tab === 'allocations') {
      fetchAllocations()
      fetchTransfers()
      fetchAssets()
      fetchEmployees()
      fetchDepartments()
    } else if (tab === 'maintenance') {
      fetchMaintenanceRequests()
    } else if (tab === 'audits') {
      fetchAuditCycles()
      fetchDepartments()
      fetchEmployees()
    } else if (tab === 'reports') {
      fetchCategories()
      fetchDepartments()
    } else if (tab === 'logs') {
      fetchLogs()
    }
  }, [tab])
  
  const addSchemaField = () => {
    setSchemaFields([...schemaFields, { key: '', type: 'string' }])
  }

  const removeSchemaField = (index) => {
    setSchemaFields(schemaFields.filter((_, i) => i !== index))
  }

  const updateSchemaField = (index, key, val) => {
    const next = [...schemaFields]
    next[index][key] = val
    setSchemaFields(next)
  }

  const handleCreateDept = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest('/api/admin/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: deptForm.name,
          code: deptForm.code,
          parentDepartmentId: deptForm.parentDepartmentId || null
        })
      }, session.token)
      setDeptForm({ name: '', code: '', parentDepartmentId: '' })
      setSuccess('Department created successfully')
      fetchDepartments()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateDept = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/departments/${editingDept.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingDept.name,
          code: editingDept.code,
          parentDepartmentId: editingDept.parentDepartmentId || null,
          departmentHeadId: editingDept.departmentHeadId || null,
          status: editingDept.status
        })
      }, session.token)
      setEditingDept(null)
      setSuccess('Department updated successfully')
      fetchDepartments()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeactivateDept = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this department?')) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/departments/${id}/deactivate`, { method: 'POST' }, session.token)
      setSuccess('Department deactivated')
      fetchDepartments()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteDept = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this department and all related data (cascade delete)?')) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/departments/${id}`, { method: 'DELETE' }, session.token)
      setSuccess('Department and all related data permanently deleted')
      fetchDepartments()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest('/api/admin/asset-categories', {
        method: 'POST',
        body: JSON.stringify({
          name: catForm.name,
          description: catForm.description,
          customFieldSchema: schemaFields
        })
      }, session.token)
      setCatForm({ name: '', description: '' })
      setSchemaFields([])
      setSuccess('Category created successfully')
      fetchCategories()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateCategory = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/asset-categories/${editingCat.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingCat.name,
          description: editingCat.description,
          customFieldSchema: schemaFields,
          isActive: editingCat.isActive
        })
      }, session.token)
      setEditingCat(null)
      setSchemaFields([])
      setSuccess('Category updated successfully')
      fetchCategories()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeactivateCategory = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this category?')) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/asset-categories/${id}/deactivate`, { method: 'POST' }, session.token)
      setSuccess('Category deactivated')
      fetchCategories()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this category and all associated assets, documents, and records?')) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/asset-categories/${id}`, { method: 'DELETE' }, session.token)
      setSuccess('Category and all associated assets and records permanently deleted')
      fetchCategories()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateEmployee = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const data = await apiRequest('/api/admin/employees', {
        method: 'POST',
        body: JSON.stringify({
          name: empForm.name,
          email: empForm.email,
          departmentId: empForm.departmentId || null,
          role: empForm.role
        })
      }, session.token)
      setEmpForm({ name: '', email: '', departmentId: '', role: 'employee' })
      setSuccess(data.message || 'Employee created and onboarding email sent successfully')
      fetchEmployees()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateEmployee = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/employees/${editingEmp.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingEmp.name,
          email: editingEmp.email,
          departmentId: editingEmp.departmentId || null
        })
      }, session.token)
      setEditingEmp(null)
      setSuccess('Employee updated successfully')
      fetchEmployees()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeactivateEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this employee?')) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/employees/${id}/deactivate`, { method: 'POST' }, session.token)
      setSuccess('Employee deactivated')
      fetchEmployees()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this employee and all transactional data (cascade delete)?')) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/employees/${id}`, { method: 'DELETE' }, session.token)
      setSuccess('Employee and all related transactional data permanently deleted')
      fetchEmployees()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleReactivateEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to reactivate this employee?')) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/employees/${id}/reactivate`, { method: 'POST' }, session.token)
      setSuccess('Employee reactivated')
      fetchEmployees()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleChangeRole = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/employees/${promotingEmp.id}/change-role`, {
        method: 'POST',
        body: JSON.stringify({
          role: promoteRole,
          departmentId: promoteDeptId || null
        })
      }, session.token)
      setPromotingEmp(null)
      setPromoteDeptId('')
      setSuccess('Employee role changed successfully')
      fetchEmployees()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateAsset = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest('/api/admin/assets', {
        method: 'POST',
        body: JSON.stringify({
          name: assetForm.name,
          categoryId: assetForm.categoryId,
          serialNumber: assetForm.serialNumber || null,
          acquisitionDate: assetForm.acquisitionDate || null,
          acquisitionCost: assetForm.acquisitionCost || null,
          condition: assetForm.condition || null,
          location: assetForm.location || null,
          isBookable: assetForm.isBookable,
          categorySpecificFields: assetCustomFields
        })
      }, session.token)
      setAssetForm({
        name: '',
        categoryId: '',
        serialNumber: '',
        acquisitionDate: '',
        acquisitionCost: '',
        condition: '',
        location: '',
        isBookable: false
      })
      setAssetCustomFields({})
      setSuccess('Asset registered successfully')
      fetchAssets()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateAsset = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/assets/${editingAsset.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingAsset.name,
          categoryId: editingAsset.categoryId,
          serialNumber: editingAsset.serialNumber || null,
          acquisitionDate: editingAsset.acquisitionDate || null,
          acquisitionCost: editingAsset.acquisitionCost || null,
          condition: editingAsset.condition || null,
          location: editingAsset.location || null,
          isBookable: editingAsset.isBookable,
          status: editingAsset.status,
          categorySpecificFields: editingAssetCustomFields
        })
      }, session.token)
      setEditingAsset(null)
      setEditingAssetCustomFields({})
      setSuccess('Asset details updated successfully')
      fetchAssets()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRetireAsset = async (id) => {
    if (!window.confirm('Are you sure you want to retire this asset?')) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/assets/${id}/retire`, { method: 'POST' }, session.token)
      setSuccess('Asset marked as retired')
      fetchAssets()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDisposeAsset = async (id) => {
    if (!window.confirm('Are you sure you want to dispose of this asset?')) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/assets/${id}/dispose`, { method: 'POST' }, session.token)
      setSuccess('Asset marked as disposed')
      fetchAssets()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteAsset = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this asset? This cannot be undone.')) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/assets/${id}`, { method: 'DELETE' }, session.token)
      setSuccess('Asset permanently deleted')
      fetchAssets()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUploadDocument = async (e, assetId) => {
    e.preventDefault()
    if (!uploadFile) {
      setError('Please select a file to upload')
      return
    }

    const file = uploadFile
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64Data = reader.result
        const data = await apiRequest(`/api/admin/assets/${assetId}/documents`, {
          method: 'POST',
          body: JSON.stringify({
            name: file.name,
            data: base64Data
          })
        }, session.token)

        setSuccess('Document uploaded successfully')
        setUploadFile(null)
        const fileInput = document.getElementById('doc-file-input')
        if (fileInput) fileInput.value = ''
        setManagingAssetDocs(data.asset)
        fetchAssets()
      } catch (err) {
        setError(err.message)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteDocument = async (assetId, docUrl) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return
    setError('')
    setSuccess('')
    const filename = docUrl.substring(docUrl.lastIndexOf('/') + 1)
    try {
      const data = await apiRequest(`/api/admin/assets/${assetId}/documents/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      }, session.token)
      setSuccess('Document deleted successfully')
      setManagingAssetDocs(data.asset)
      fetchAssets()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateAllocation = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest('/api/admin/allocations', {
        method: 'POST',
        body: JSON.stringify({
          assetId: allocationForm.assetId,
          employeeId: allocationForm.employeeId || null,
          departmentId: allocationForm.departmentId || null,
          expectedReturnDate: allocationForm.expectedReturnDate || null
        })
      }, session.token)
      setAllocationForm({ assetId: '', employeeId: '', departmentId: '', expectedReturnDate: '' })
      setSuccess('Resource allocated successfully')
      fetchAllocations()
      fetchAssets()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleApproveTransfer = async (id) => {
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/transfers/${id}/approve`, {
        method: 'POST'
      }, session.token)
      setSuccess('Transfer request approved successfully')
      fetchTransfers()
      fetchAllocations()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRejectTransfer = async (id) => {
    const reason = window.prompt('Enter rejection reason:')
    if (reason === null) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/transfers/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      }, session.token)
      setSuccess('Transfer request rejected')
      fetchTransfers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleApproveMaintenance = async (id) => {
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/maintenance-requests/${id}/approve`, {
        method: 'POST'
      }, session.token)
      setSuccess('Maintenance request approved')
      fetchMaintenanceRequests()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRejectMaintenance = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/maintenance-requests/${rejectingMaintenanceId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: maintenanceReason })
      }, session.token)
      setSuccess('Maintenance request rejected')
      setRejectingMaintenanceId(null)
      setMaintenanceReason('')
      fetchMaintenanceRequests()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAssignTechnician = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/maintenance-requests/${assigningTechId}/assign-technician`, {
        method: 'POST',
        body: JSON.stringify({ technicianName })
      }, session.token)
      setSuccess('Technician assigned successfully')
      setAssigningTechId(null)
      setTechnicianName('')
      fetchMaintenanceRequests()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateAuditCycle = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest('/api/admin/audit-cycles', {
        method: 'POST',
        body: JSON.stringify({
          name: auditCycleForm.name,
          scopeDepartmentId: auditCycleForm.scopeDepartmentId || null,
          scopeLocation: auditCycleForm.scopeLocation || null,
          startDate: auditCycleForm.startDate,
          endDate: auditCycleForm.endDate
        })
      }, session.token)
      setAuditCycleForm({ name: '', scopeDepartmentId: '', scopeLocation: '', startDate: '', endDate: '' })
      setSuccess('Audit cycle created successfully')
      fetchAuditCycles()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleStartAuditCycle = async (id) => {
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/audit-cycles/${id}/start`, {
        method: 'POST'
      }, session.token)
      setSuccess('Audit cycle started successfully')
      fetchAuditCycles()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAssignAuditors = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/audit-cycles/${assigningAuditorsCycle.id}/assign-auditors`, {
        method: 'POST',
        body: JSON.stringify({ employeeIds: selectedAuditors })
      }, session.token)
      setSuccess('Auditors assigned successfully')
      setAssigningAuditorsCycle(null)
      setSelectedAuditors([])
      fetchAuditCycles()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCloseAuditCycle = async (id) => {
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/admin/audit-cycles/${id}/close`, {
        method: 'POST'
      }, session.token)
      setSuccess('Audit cycle closed successfully')
      fetchAuditCycles()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AppShell
      title="Asset Management"
      eyebrow="Admin Console"
      session={session}
      onLogout={onLogout}
      activeTab={tab}
      onTabChange={setTab}
      navItems={[
        { value: 'dashboard', label: 'Dashboard' },
        { value: 'departments', label: 'Departments' },
        { value: 'categories', label: 'Asset Categories' },
        { value: 'employees', label: 'Employees' },
        { value: 'assets', label: 'Assets' },
        { value: 'allocations', label: 'Allocations & Transfers' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'audits', label: 'Audit Cycles' },
        { value: 'reports', label: 'Reports & Analytics' },
        ...(session.user.role === 'admin' ? [{ value: 'logs', label: 'Audit Logs' }] : []),
      ]}
    >
        <StatusMessage type="error">{error ? `Error: ${error}` : ''}</StatusMessage>
        <StatusMessage type="success">{success}</StatusMessage>

        {tab === 'dashboard' && dashboardData && dashboardData.kpis && (
          <div className="dash-section animate-fade-in">
            <div className="section-heading mb-6">
              <h3>Operational Dashboard</h3>
              <p className="text-sm text-violet-500 font-medium">Real-time status overview of enterprise assets</p>
            </div>
            
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-card-label">Total Assets Available</span>
                <span className="kpi-card-value accent">{dashboardData.kpis.totalAssetsAvailable}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-card-label">Assets Allocated</span>
                <span className="kpi-card-value">{dashboardData.kpis.assetsAllocated}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-card-label">Maintenance Due Today</span>
                <span className="kpi-card-value">{dashboardData.kpis.maintenanceDueToday}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-card-label">Active Bookings</span>
                <span className="kpi-card-value">{dashboardData.kpis.activeBookings}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-card-label">Pending Transfers</span>
                <span className="kpi-card-value">{dashboardData.kpis.pendingTransfers}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-card-label" style={{ color: '#b91c1c' }}>Overdue Returns</span>
                <span className="kpi-card-value" style={{ color: '#b91c1c' }}>{dashboardData.kpis.overdueReturnsCount}</span>
              </div>
            </div>

            <div className="quick-actions-panel bg-white border border-violet-100 rounded-xl p-6 shadow-sm my-6">
              <h4 className="font-bold text-violet-950 mb-4">Quick Actions</h4>
              <div className="flex flex-wrap gap-4">
                <button type="button" className="btn btn-primary" onClick={() => setTab('assets')}>
                  Register Asset
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setTab('allocations')}>
                  Allocate Resource
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setTab('maintenance')}>
                  Raise Maintenance Request
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setTab('allocations')}>
                  Initiate Transfer
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setTab('allocations')}>
                  Return Asset
                </button>
              </div>
            </div>

            {dashboardData.upcomingReturnAlerts && dashboardData.upcomingReturnAlerts.length > 0 && (
              <div className="alert-list bg-amber-50 border border-amber-200 rounded-xl p-5 my-6">
                <h4 className="font-bold text-amber-900 mb-3">⚠️ Upcoming &amp; Overdue Returns Alert</h4>
                <div className="grid gap-3">
                  {dashboardData.upcomingReturnAlerts.map(alert => (
                    <div key={alert.id} className="flex justify-between items-center bg-white border border-amber-100 rounded-lg p-3 shadow-sm">
                      <div>
                        <span className="font-bold text-sm text-neutral-800">{alert.asset?.name || alert.assetName}</span>
                        <span className="text-xs text-neutral-500 block">Holder: {alert.allocatedToEmployee?.name || alert.holderName} | Expected Return: {new Date(alert.expectedReturnDate).toLocaleDateString()}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${alert.daysRemaining < 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        {alert.daysRemaining < 0 ? `${Math.abs(alert.daysRemaining)} Days Overdue` : `${alert.daysRemaining} Days Left`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-white border border-violet-100 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-violet-950 mb-3">Recent Maintenance Activities</h4>
                {(!dashboardData.maintenanceSummary || dashboardData.maintenanceSummary.length === 0) ? (
                  <p className="text-sm text-neutral-500">No recent maintenance requests.</p>
                ) : (
                  <div className="grid gap-2">
                    {dashboardData.maintenanceSummary.slice(0, 5).map(req => (
                      <div key={req.id} className="flex justify-between items-center border-b border-neutral-100 pb-2">
                        <div>
                          <span className="text-sm font-semibold text-neutral-800 block">{req.asset?.name || 'Asset'}</span>
                          <span className="text-xs text-neutral-500 block">{req.issueDescription}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${req.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-violet-100 text-violet-800'}`}>
                          {formatStatus(req.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-violet-100 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-violet-950 mb-3">Recent Booking Activities</h4>
                {(!dashboardData.bookingSummary || dashboardData.bookingSummary.length === 0) ? (
                  <p className="text-sm text-neutral-500">No active bookings.</p>
                ) : (
                  <div className="grid gap-2">
                    {dashboardData.bookingSummary.slice(0, 5).map(bk => (
                      <div key={bk.id} className="flex justify-between items-center border-b border-neutral-100 pb-2">
                        <div>
                          <span className="text-sm font-semibold text-neutral-800 block">{bk.resource?.name || bk.resource?.linkedAsset?.name || 'Resource'}</span>
                          <span className="text-xs text-neutral-500 block">{new Date(bk.startTime).toLocaleString()} to {new Date(bk.endTime).toLocaleString()}</span>
                        </div>
                        <span className="text-xs text-neutral-500 font-medium">
                          {bk.bookedBy?.name || 'User'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'departments' && (
          <DepartmentsTab
            departments={departments}
            employees={employees}
            deptForm={deptForm}
            setDeptForm={setDeptForm}
            editingDept={editingDept}
            setEditingDept={setEditingDept}
            handleCreateDept={handleCreateDept}
            handleUpdateDept={handleUpdateDept}
            handleDeactivateDept={handleDeactivateDept}
            handleDeleteDept={handleDeleteDept}
            isAdmin={session.user.role === 'admin'}
          />
        )}
        {tab === 'categories' && (
          <CategoriesTab
            categories={categories}
            catForm={catForm}
            setCatForm={setCatForm}
            schemaFields={schemaFields}
            setSchemaFields={setSchemaFields}
            addSchemaField={addSchemaField}
            removeSchemaField={removeSchemaField}
            updateSchemaField={updateSchemaField}
            editingCat={editingCat}
            setEditingCat={setEditingCat}
            handleCreateCategory={handleCreateCategory}
            handleUpdateCategory={handleUpdateCategory}
            handleDeactivateCategory={handleDeactivateCategory}
            handleDeleteCategory={handleDeleteCategory}
            isAdmin={session.user.role === 'admin'}
          />
        )}
        {tab === 'employees' && (
          <EmployeesTab
            employees={employees}
            departments={departments}
            promotingEmp={promotingEmp}
            setPromotingEmp={setPromotingEmp}
            promoteRole={promoteRole}
            setPromoteRole={setPromoteRole}
            promoteDeptId={promoteDeptId}
            setPromoteDeptId={setPromoteDeptId}
            editingEmp={editingEmp}
            setEditingEmp={setEditingEmp}
            empForm={empForm}
            setEmpForm={setEmpForm}
            handleCreateEmployee={handleCreateEmployee}
            handleUpdateEmployee={handleUpdateEmployee}
            handleDeactivateEmployee={handleDeactivateEmployee}
            handleReactivateEmployee={handleReactivateEmployee}
            handleDeleteEmployee={handleDeleteEmployee}
            handleChangeRole={handleChangeRole}
            isAdmin={session.user.role === 'admin'}
          />
        )}
        {tab === 'assets' && (
          <AssetsTab
            assets={assets}
            categories={categories}
            editingAsset={editingAsset}
            setEditingAsset={setEditingAsset}
            editingAssetCustomFields={editingAssetCustomFields}
            setEditingAssetCustomFields={setEditingAssetCustomFields}
            managingAssetDocs={managingAssetDocs}
            setManagingAssetDocs={setManagingAssetDocs}
            setUploadFile={setUploadFile}
            assetForm={assetForm}
            setAssetForm={setAssetForm}
            assetCustomFields={assetCustomFields}
            setAssetCustomFields={setAssetCustomFields}
            handleCreateAsset={handleCreateAsset}
            handleUpdateAsset={handleUpdateAsset}
            handleRetireAsset={handleRetireAsset}
            handleDisposeAsset={handleDisposeAsset}
            handleDeleteAsset={handleDeleteAsset}
            handleUploadDocument={handleUploadDocument}
            handleDeleteDocument={handleDeleteDocument}
          />
        )}
        {tab === 'allocations' && (
          <AllocationsTab
            allocations={allocations}
            transfers={transfers}
            assets={assets}
            employees={employees}
            departments={departments}
            allocationForm={allocationForm}
            setAllocationForm={setAllocationForm}
            handleCreateAllocation={handleCreateAllocation}
            handleApproveTransfer={handleApproveTransfer}
            handleRejectTransfer={handleRejectTransfer}
            handleApproveReturn={handleApproveReturn}
          />
        )}
        {tab === 'maintenance' && (
          <MaintenanceTab
            maintenanceRequests={maintenanceRequests}
            rejectingMaintenanceId={rejectingMaintenanceId}
            setRejectingMaintenanceId={setRejectingMaintenanceId}
            maintenanceReason={maintenanceReason}
            setMaintenanceReason={setMaintenanceReason}
            assigningTechId={assigningTechId}
            setAssigningTechId={setAssigningTechId}
            technicianName={technicianName}
            setTechnicianName={setTechnicianName}
            handleApproveMaintenance={handleApproveMaintenance}
            handleRejectMaintenance={handleRejectMaintenance}
            handleAssignTechnician={handleAssignTechnician}
          />
        )}
        {tab === 'audits' && (
          <AuditsTab
            auditCycles={auditCycles}
            departments={departments}
            employees={employees}
            auditCycleForm={auditCycleForm}
            setAuditCycleForm={setAuditCycleForm}
            assigningAuditorsCycle={assigningAuditorsCycle}
            setAssigningAuditorsCycle={setAssigningAuditorsCycle}
            selectedAuditors={selectedAuditors}
            setSelectedAuditors={setSelectedAuditors}
            handleCreateAuditCycle={handleCreateAuditCycle}
            handleStartAuditCycle={handleStartAuditCycle}
            handleAssignAuditors={handleAssignAuditors}
            handleCloseAuditCycle={handleCloseAuditCycle}
            isAdmin={session.user.role === 'admin'}
          />
        )}
        {tab === 'reports' && (
          <ReportsView token={session.token} categories={categories} departments={departments} />
        )}
        {tab === 'logs' && <LogsTab logs={logs} />}
    </AppShell>
  )
}

function DashboardPage({ session, onLogout, role }) {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(null)
  const [error, setError] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (role === 'admin' || role === 'asset_manager') {
    return <AdminDashboardView session={session} onLogout={onLogout} />
  }

  if (role === 'department_head') {
    return <DepartmentHeadDashboardView session={session} onLogout={onLogout} />
  }

  if (role === 'employee') {
    return <EmployeeDashboardView session={session} onLogout={onLogout} />
  }

  return (
    <AppShell
      title={roleToLabel(role)}
      session={session}
      onLogout={onLogout}
      activeTab="overview"
      onTabChange={() => {}}
      hubLink={false}
      navItems={[
        { value: 'overview', label: 'Overview' },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Protected data</CardTitle>
          <CardDescription>Raw dashboard payload for this role.</CardDescription>
        </CardHeader>
        <CardContent>
          <StatusMessage type="error">{error}</StatusMessage>
          {dashboardData ? <pre>{JSON.stringify(dashboardData, null, 2)}</pre> : <Skeleton className="h-40 w-full" />}
        </CardContent>
      </Card>
    </AppShell>
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

function DepartmentHeadDashboardView({ session, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [dashboardData, setDashboardData] = useState(null)
  const [assets, setAssets] = useState([])
  const [allocations, setAllocations] = useState([])
  const [transfers, setTransfers] = useState([])
  const [maintenanceRequests, setMaintenanceRequests] = useState([])
  const [auditCycles, setAuditCycles] = useState([])
  const [auditRecords, setAuditRecords] = useState([])
  const [selectedCycleId, setSelectedCycleId] = useState(null)
  const [bookings, setBookings] = useState([])
  const [bookableResources, setBookableResources] = useState([])
  const [employees, setEmployees] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Forms
  const [allocationForm, setAllocationForm] = useState({ assetId: '', employeeId: '', departmentId: '', expectedReturnDate: '' })
  const [maintenanceForm, setMaintenanceForm] = useState({ assetId: '', issueDescription: '', priority: 'medium' })
  const [bookingForm, setBookingForm] = useState({ resourceId: '', startTime: '', endTime: '' })
  const [auditRecordForm, setAuditRecordForm] = useState({ recordId: '', result: 'verified', notes: '' })

  const fetchDashboardKpis = async () => {
    try {
      const data = await apiRequest('/api/dashboard/department-head', {}, session.token)
      setDashboardData(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAssets = async () => {
    try {
      const data = await apiRequest('/api/department/assets', {}, session.token)
      setAssets(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAllocations = async () => {
    try {
      const data = await apiRequest('/api/department/allocations', {}, session.token)
      setAllocations(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchTransfers = async () => {
    try {
      const data = await apiRequest('/api/department/transfers', {}, session.token)
      setTransfers(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchMaintenanceRequests = async () => {
    try {
      const data = await apiRequest('/api/department/maintenance-requests', {}, session.token)
      setMaintenanceRequests(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAuditCycles = async () => {
    try {
      const data = await apiRequest('/api/department/audit-cycles', {}, session.token)
      setAuditCycles(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAuditRecords = async (cycleId) => {
    try {
      const data = await apiRequest(`/api/department/audit-cycles/${cycleId}/records`, {}, session.token)
      setAuditRecords(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchBookings = async () => {
    try {
      const data = await apiRequest('/api/department/bookings', {}, session.token)
      setBookings(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchBookableResources = async () => {
    try {
      const data = await apiRequest('/api/department/bookable-resources', {}, session.token)
      setBookableResources(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchEmployees = async () => {
    try {
      const data = await apiRequest('/api/department/employees', {}, session.token)
      setEmployees(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    setError('')
    setSuccess('')
    if (tab === 'dashboard') {
      fetchDashboardKpis()
    } else if (tab === 'assets') {
      fetchAssets()
    } else if (tab === 'allocations') {
      fetchAllocations()
      fetchTransfers()
      fetchAssets()
      fetchEmployees()
    } else if (tab === 'maintenance') {
      fetchMaintenanceRequests()
      fetchAssets()
    } else if (tab === 'audits') {
      fetchAuditCycles()
    } else if (tab === 'bookings') {
      fetchBookings()
      fetchBookableResources()
    }
  }, [tab])

  const handleCreateAllocation = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest('/api/department/allocations', {
        method: 'POST',
        body: JSON.stringify({
          assetId: allocationForm.assetId,
          employeeId: allocationForm.employeeId || undefined,
          expectedReturnDate: allocationForm.expectedReturnDate || undefined
        })
      }, session.token)
      setSuccess('Asset allocated successfully')
      setAllocationForm({ assetId: '', employeeId: '', departmentId: '', expectedReturnDate: '' })
      fetchAllocations()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleApproveTransfer = async (id) => {
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/department/transfers/${id}/approve`, { method: 'POST' }, session.token)
      setSuccess('Transfer request approved successfully')
      fetchTransfers()
      fetchAllocations()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRejectTransfer = async (id) => {
    const reason = prompt('Reason for rejection:')
    if (reason === null) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/department/transfers/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      }, session.token)
      setSuccess('Transfer request rejected successfully')
      fetchTransfers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRaiseMaintenance = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest('/api/department/maintenance-requests', {
        method: 'POST',
        body: JSON.stringify(maintenanceForm)
      }, session.token)
      setSuccess('Maintenance request raised successfully')
      setMaintenanceForm({ assetId: '', issueDescription: '', priority: 'medium' })
      fetchMaintenanceRequests()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateBooking = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest('/api/department/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingForm)
      }, session.token)
      setSuccess('Booking created successfully')
      setBookingForm({ resourceId: '', startTime: '', endTime: '' })
      fetchBookings()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCancelBooking = async (id) => {
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/department/bookings/${id}/cancel`, { method: 'POST' }, session.token)
      setSuccess('Booking cancelled successfully')
      fetchBookings()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmitAuditRecord = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/department/audit-records/${auditRecordForm.recordId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ result: auditRecordForm.result, notes: auditRecordForm.notes })
      }, session.token)
      setSuccess('Audit result submitted successfully')
      setAuditRecordForm({ recordId: '', result: 'verified', notes: '' })
      if (selectedCycleId) fetchAuditRecords(selectedCycleId)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AppShell
      title="Department Workspace"
      eyebrow="Dashboard Hub"
      session={session}
      onLogout={onLogout}
      activeTab={tab}
      onTabChange={setTab}
      hubLink={false}
      navItems={[
        { value: 'dashboard', label: 'KPI Overview' },
        { value: 'assets', label: 'Department Assets' },
        { value: 'allocations', label: 'Allocations & Transfers' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'audits', label: 'Audits' },
        { value: 'bookings', label: 'Bookings' },
      ]}
    >
        <StatusMessage type="error">{error ? `Error: ${error}` : ''}</StatusMessage>
        <StatusMessage type="success">{success}</StatusMessage>

        {tab === 'dashboard' && dashboardData && (
          <div className="dash-section">
            <div className="section-heading">
              <h3>Department KPI Metrics</h3>
              <span className="text-sm text-violet-500 font-medium">{dashboardData.department}</span>
            </div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-card-label">Total Assets</span>
                <span className="kpi-card-value accent">{dashboardData.kpis.assetsCount}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-card-label">Active Allocations</span>
                <span className="kpi-card-value">{dashboardData.kpis.allocationsCount}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-card-label">Pending Transfers</span>
                <span className="kpi-card-value">{dashboardData.kpis.pendingTransfersCount}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-card-label">Pending Maintenance</span>
                <span className="kpi-card-value">{dashboardData.kpis.pendingMaintenanceCount}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'assets' && (
          <div>
            <h3>Department Assets</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Tag</th>
                  <th>Serial</th>
                  <th>Condition</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Current Holder</th>
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr><td colSpan="7">No department assets found.</td></tr>
                ) : (
                  assets.map(asset => (
                    <tr key={asset.id}>
                      <td>{asset.name}</td>
                      <td>{asset.assetTag}</td>
                      <td>{asset.serialNumber || '-'}</td>
                      <td>{asset.condition || '-'}</td>
                      <td>{asset.location || '-'}</td>
                      <td>{asset.status}</td>
                      <td>
                        {asset.currentHolderEmployee
                          ? `Employee: ${asset.currentHolderEmployee.name}`
                          : asset.currentHolderDepartment
                          ? `Department: ${asset.currentHolderDepartment.name}`
                          : 'Available'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'allocations' && (
          <div>
            <h3>Department Allocations & Transfers</h3>
            <form onSubmit={handleCreateAllocation}>
              <h4>Allocate Asset to Employee in Department</h4>
              <p>
                <label>Select Asset:<br />
                  <select
                    value={allocationForm.assetId}
                    onChange={e => setAllocationForm({ ...allocationForm, assetId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Asset --</option>
                    {assets.filter(a => a.status === 'available').map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                    ))}
                  </select>
                </label>
              </p>
              <p>
                <label>Allocate To Employee:<br />
                  <select
                    value={allocationForm.employeeId}
                    onChange={e => setAllocationForm({ ...allocationForm, employeeId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</option>
                    ))}
                  </select>
                </label>
              </p>
              <p>
                <label>Expected Return Date:<br />
                  <input
                    type="date"
                    value={allocationForm.expectedReturnDate}
                    onChange={e => setAllocationForm({ ...allocationForm, expectedReturnDate: e.target.value })}
                  />
                </label>
              </p>
              <button type="submit">Allocate Asset</button>
            </form>

            <hr />
            <h4>Department Active Allocations</h4>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Allocated To</th>
                  <th>Allocated Date</th>
                  <th>Expected Return</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allocations.length === 0 ? (
                  <tr><td colSpan="5">No allocations found.</td></tr>
                ) : (
                  allocations.map(alloc => (
                    <tr key={alloc.id}>
                      <td>{alloc.asset?.name} ({alloc.asset?.assetTag})</td>
                      <td>
                        {alloc.allocatedToEmployee
                          ? `Employee: ${alloc.allocatedToEmployee.name}`
                          : alloc.allocatedToDepartment
                          ? `Department: ${alloc.allocatedToDepartment.name}`
                          : '-'}
                      </td>
                      <td>{new Date(alloc.allocatedDate).toLocaleDateString()}</td>
                      <td>{alloc.expectedReturnDate ? new Date(alloc.expectedReturnDate).toLocaleDateString() : '-'}</td>
                      <td>{formatStatus(alloc.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <hr />
            <h4>Department Transfer Requests</h4>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Current Allocation</th>
                  <th>Requested By</th>
                  <th>Target Holder</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 ? (
                  <tr><td colSpan="7">No transfer requests found.</td></tr>
                ) : (
                  transfers.map(tr => (
                    <tr key={tr.id}>
                      <td>{tr.asset?.name} ({tr.asset?.assetTag})</td>
                      <td>
                        {tr.currentAllocation?.allocatedToEmployee
                          ? `Employee: ${tr.currentAllocation.allocatedToEmployee.name}`
                          : tr.currentAllocation?.allocatedToDepartment
                          ? `Dept: ${tr.currentAllocation.allocatedToDepartment.name}`
                          : 'Unallocated'}
                      </td>
                      <td>{tr.requestedBy?.name}</td>
                      <td>
                        {tr.requestedToEmployee
                          ? `Employee: ${tr.requestedToEmployee.name}`
                          : tr.requestedToDepartment
                          ? `Dept: ${tr.requestedToDepartment.name}`
                          : '-'}
                      </td>
                      <td>{tr.reason || '-'}</td>
                      <td>{formatStatus(tr.status)}</td>
                      <td>
                        {tr.status === 'requested' ? (
                          <>
                            <button type="button" onClick={() => handleApproveTransfer(tr.id)}>Approve</button>
                            <button type="button" onClick={() => handleRejectTransfer(tr.id)}>Reject</button>
                          </>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'maintenance' && (
          <div>
            <h3>Maintenance</h3>
            <form onSubmit={handleRaiseMaintenance}>
              <h4>Raise Maintenance Request</h4>
              <p>
                <label>Select Asset:<br />
                  <select
                    value={maintenanceForm.assetId}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, assetId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Asset --</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                    ))}
                  </select>
                </label>
              </p>
              <p>
                <label>Issue Description:<br />
                  <textarea
                    value={maintenanceForm.issueDescription}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, issueDescription: e.target.value })}
                    required
                  />
                </label>
              </p>
              <p>
                <label>Priority:<br />
                  <select
                    value={maintenanceForm.priority}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </p>
              <button type="submit">Raise Request</button>
            </form>

            <hr />
            <h4>Maintenance Directory</h4>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Raised By</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Technician</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceRequests.length === 0 ? (
                  <tr><td colSpan="6">No maintenance requests found.</td></tr>
                ) : (
                  maintenanceRequests.map(req => (
                    <tr key={req.id}>
                      <td>{req.asset?.name} ({req.asset?.assetTag})</td>
                      <td>{req.raisedBy?.name}</td>
                      <td>{req.issueDescription}</td>
                      <td>{formatStatus(req.priority)}</td>
                      <td>{formatStatus(req.status)}</td>
                      <td>{req.technicianName || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'audits' && (
          <div>
            <h3>Audit Cycles</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Scope Dept</th>
                  <th>Scope Location</th>
                  <th>Status</th>
                  <th>Dates</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {auditCycles.length === 0 ? (
                  <tr><td colSpan="6">No assigned audit cycles found.</td></tr>
                ) : (
                  auditCycles.map(cycle => (
                    <tr key={cycle.id}>
                      <td>{cycle.name}</td>
                      <td>{cycle.scopeDepartment?.name || 'All'}</td>
                      <td>{cycle.scopeLocation || 'All'}</td>
                      <td>{formatStatus(cycle.status)}</td>
                      <td>{new Date(cycle.startDate).toLocaleDateString()} to {new Date(cycle.endDate).toLocaleDateString()}</td>
                      <td>
                        {cycle.status === 'in_progress' && (
                          <button type="button" onClick={() => {
                            setSelectedCycleId(cycle.id)
                            fetchAuditRecords(cycle.id)
                          }}>Verify Assets</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {selectedCycleId && (
              <div className="mt-5">
                <h4>Audit Records for Cycle</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Condition</th>
                      <th>Location</th>
                      <th>Result</th>
                      <th>Notes</th>
                      <th>Submit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRecords.map(rec => (
                      <tr key={rec.id}>
                        <td>{rec.asset?.name} ({rec.asset?.assetTag})</td>
                        <td>{rec.asset?.condition}</td>
                        <td>{rec.asset?.location}</td>
                        <td>{rec.result}</td>
                        <td>{rec.notes || '-'}</td>
                        <td>
                          {rec.result === 'pending' ? (
                            <button type="button" onClick={() => setAuditRecordForm({ ...auditRecordForm, recordId: rec.id })}>Submit Result</button>
                          ) : (
                            <span>Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {auditRecordForm.recordId && (
              <form onSubmit={handleSubmitAuditRecord} className="mt-5">
                <h4>Submit Verification Result</h4>
                <p>
                  <label>Result:<br />
                    <select
                      value={auditRecordForm.result}
                      onChange={e => setAuditRecordForm({ ...auditRecordForm, result: e.target.value })}
                      required
                    >
                      <option value="verified">Verified</option>
                      <option value="missing">Missing</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </label>
                </p>
                <p>
                  <label>Notes:<br />
                    <textarea
                      value={auditRecordForm.notes}
                      onChange={e => setAuditRecordForm({ ...auditRecordForm, notes: e.target.value })}
                    />
                  </label>
                </p>
                <button type="submit">Submit Verification</button>
                <button type="button" onClick={() => setAuditRecordForm({ recordId: '', result: 'verified', notes: '' })}>Cancel</button>
              </form>
            )}
          </div>
        )}

        {tab === 'bookings' && (
          <div>
            <h3>Bookings</h3>
            <form onSubmit={handleCreateBooking}>
              <h4>Book a Resource</h4>
              <p>
                <label>Select Resource:<br />
                  <select
                    value={bookingForm.resourceId}
                    onChange={e => setBookingForm({ ...bookingForm, resourceId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Resource --</option>
                    {bookableResources.map(res => (
                      <option key={res.id} value={res.id}>{res.linkedAsset?.name} ({res.linkedAsset?.assetTag})</option>
                    ))}
                  </select>
                </label>
              </p>
              <p>
                <label>Start Time:<br />
                  <input
                    type="datetime-local"
                    value={bookingForm.startTime}
                    onChange={e => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                    required
                  />
                </label>
              </p>
              <p>
                <label>End Time:<br />
                  <input
                    type="datetime-local"
                    value={bookingForm.endTime}
                    onChange={e => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                    required
                  />
                </label>
              </p>
              <button type="submit">Book Resource</button>
            </form>

            <BookingCalendar
              bookings={bookings}
              onSelectTimeSlot={date => {
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const day = String(date.getDate()).padStart(2, '0')
                setBookingForm(prev => ({
                  ...prev,
                  startTime: `${year}-${month}-${day}T09:00`,
                  endTime: `${year}-${month}-${day}T17:00`
                }))
              }}
            />

            <hr />
            <h4>Department & Personal Bookings</h4>
            <table>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Booked By</th>
                  <th>Department</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan="7">No bookings found.</td></tr>
                ) : (
                  bookings.map(bk => (
                    <tr key={bk.id}>
                      <td>{bk.resource?.linkedAsset?.name || 'Resource'}</td>
                      <td>{bk.bookedBy?.name}</td>
                      <td>{bk.bookedForDepartment?.name || '-'}</td>
                      <td>{new Date(bk.startTime).toLocaleString()}</td>
                      <td>{new Date(bk.endTime).toLocaleString()}</td>
                      <td>{bk.status}</td>
                      <td>
                        {bk.status === 'upcoming' && (
                          <button type="button" onClick={() => handleCancelBooking(bk.id)}>Cancel Booking</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
    </AppShell>
  )
}

function EmployeeDashboardView({ session, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [dashboardData, setDashboardData] = useState(null)
  const [myAssets, setMyAssets] = useState([])
  const [allAssets, setAllAssets] = useState([])
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [assetHistory, setAssetHistory] = useState(null)
  const [bookings, setBookings] = useState([])
  const [bookableResources, setBookableResources] = useState([])
  const [transfers, setTransfers] = useState([])
  const [maintenanceRequests, setMaintenanceRequests] = useState([])
  const [auditCycles, setAuditCycles] = useState([])
  const [auditRecords, setAuditRecords] = useState([])
  const [selectedCycleId, setSelectedCycleId] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search/Filter for Asset Registry
  const [searchQuery, setSearchQuery] = useState('')

  // Forms
  const [bookingForm, setBookingForm] = useState({ resourceId: '', startTime: '', endTime: '' })
  const [editingBooking, setEditingBooking] = useState(null)
  const [transferForm, setTransferForm] = useState({ assetId: '', reason: '' })
  const [maintenanceForm, setMaintenanceForm] = useState({ assetId: '', issueDescription: '', priority: 'medium' })
  const [auditRecordForm, setAuditRecordForm] = useState({ recordId: '', result: 'verified', notes: '' })

  const fetchDashboardKpis = async () => {
    try {
      const data = await apiRequest('/api/dashboard/employee', {}, session.token)
      setDashboardData(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchMyAssets = async () => {
    try {
      const data = await apiRequest('/api/employee/my/assets', {}, session.token)
      setMyAssets(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRequestReturn = async (id) => {
    if (!window.confirm('Are you sure you want to request a return for this asset?')) return
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/employee/assets/${id}/request-return`, {
        method: 'POST'
      }, session.token)
      setSuccess('Return request submitted successfully')
      fetchMyAssets()
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAllAssets = async () => {
    try {
      const data = await apiRequest('/api/employee/assets', {}, session.token)
      setAllAssets(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAssetHistory = async (assetId) => {
    try {
      const data = await apiRequest(`/api/employee/assets/${assetId}/history`, {}, session.token)
      setAssetHistory(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchBookings = async () => {
    try {
      const data = await apiRequest('/api/employee/my/bookings', {}, session.token)
      setBookings(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchBookableResources = async () => {
    try {
      const resData = await apiRequest('/api/employee/bookable-resources', {}, session.token)
      setBookableResources(resData)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchTransfers = async () => {
    try {
      const data = await apiRequest('/api/employee/my/transfers', {}, session.token)
      setTransfers(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchMaintenanceRequests = async () => {
    try {
      const data = await apiRequest('/api/employee/my/maintenance-requests', {}, session.token)
      setMaintenanceRequests(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAuditCycles = async () => {
    try {
      const data = await apiRequest('/api/employee/my/audit-cycles', {}, session.token)
      setAuditCycles(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAuditRecords = async (cycleId) => {
    try {
      const data = await apiRequest(`/api/employee/my/audit-cycles/${cycleId}/records`, {}, session.token)
      setAuditRecords(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest('/api/employee/my/notifications', {}, session.token)
      setNotifications(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    setError('')
    setSuccess('')
    setSelectedAsset(null)
    setAssetHistory(null)
    setSelectedCycleId(null)
    setAuditRecords([])
    
    if (tab === 'dashboard') {
      fetchDashboardKpis()
    } else if (tab === 'my-assets') {
      fetchMyAssets()
    } else if (tab === 'registry') {
      fetchAllAssets()
    } else if (tab === 'bookings') {
      fetchBookings()
      fetchBookableResources()
    } else if (tab === 'transfers') {
      fetchTransfers()
      fetchMyAssets()
    } else if (tab === 'maintenance') {
      fetchMaintenanceRequests()
      fetchMyAssets()
    } else if (tab === 'audits') {
      fetchAuditCycles()
    } else if (tab === 'notifications') {
      fetchNotifications()
    }
  }, [tab])

  const handleCreateBooking = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest('/api/employee/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingForm)
      }, session.token)
      setSuccess('Booking created successfully')
      setBookingForm({ resourceId: '', startTime: '', endTime: '' })
      fetchBookings()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateBooking = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/employee/bookings/${editingBooking.id}`, {
        method: 'PUT',
        body: JSON.stringify({ startTime: bookingForm.startTime, endTime: bookingForm.endTime })
      }, session.token)
      setSuccess('Booking updated successfully')
      setEditingBooking(null)
      setBookingForm({ resourceId: '', startTime: '', endTime: '' })
      fetchBookings()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCancelBooking = async (id) => {
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/employee/bookings/${id}/cancel`, { method: 'POST' }, session.token)
      setSuccess('Booking cancelled successfully')
      fetchBookings()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateTransfer = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest('/api/employee/transfers', {
        method: 'POST',
        body: JSON.stringify(transferForm)
      }, session.token)
      setSuccess('Transfer request initiated successfully')
      setTransferForm({ assetId: '', reason: '' })
      fetchTransfers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRaiseMaintenance = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest('/api/employee/maintenance-requests', {
        method: 'POST',
        body: JSON.stringify(maintenanceForm)
      }, session.token)
      setSuccess('Maintenance request raised successfully')
      setMaintenanceForm({ assetId: '', issueDescription: '', priority: 'medium' })
      fetchMaintenanceRequests()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmitAuditRecord = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiRequest(`/api/employee/audit-records/${auditRecordForm.recordId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ result: auditRecordForm.result, notes: auditRecordForm.notes })
      }, session.token)
      setSuccess('Audit result submitted successfully')
      setAuditRecordForm({ recordId: '', result: 'verified', notes: '' })
      if (selectedCycleId) fetchAuditRecords(selectedCycleId)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleMarkAsRead = async (id) => {
    try {
      await apiRequest(`/api/employee/my/notifications/${id}/read`, { method: 'POST' }, session.token)
      fetchNotifications()
    } catch (err) {
      setError(err.message)
    }
  }

  // Filter Assets Registry
  const filteredAssets = allAssets.filter(asset => {
    const query = searchQuery.toLowerCase()
    return (
      asset.name?.toLowerCase().includes(query) ||
      asset.assetTag?.toLowerCase().includes(query) ||
      asset.category?.name?.toLowerCase().includes(query)
    )
  })

  return (
    <AppShell
      title="Employee Workspace"
      eyebrow="Dashboard Hub"
      session={session}
      onLogout={onLogout}
      activeTab={tab}
      onTabChange={setTab}
      hubLink={false}
      navItems={[
        { value: 'dashboard', label: 'KPI Overview' },
        { value: 'my-assets', label: 'My Assets' },
        { value: 'registry', label: 'Asset Registry' },
        { value: 'bookings', label: 'Book Resource' },
        { value: 'transfers', label: 'Initiate Transfer' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'audits', label: 'Audits' },
        {
          value: 'notifications',
          label: `Notifications${dashboardData?.kpis?.unreadNotificationsCount > 0 ? ` (${dashboardData.kpis.unreadNotificationsCount})` : ''}`,
        },
      ]}
    >
        <StatusMessage type="error">{error ? `Error: ${error}` : ''}</StatusMessage>
        <StatusMessage type="success">{success}</StatusMessage>

        {tab === 'dashboard' && dashboardData && (
          <div className="dash-section">
            <div className="section-heading">
              <h3>Welcome back, {session.user.name}!</h3>
            </div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-card-label">My Assets</span>
                <span className="kpi-card-value accent">{dashboardData.kpis.assetsCount}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-card-label">Upcoming Bookings</span>
                <span className="kpi-card-value">{dashboardData.kpis.bookingsCount}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-card-label">Pending Maintenance</span>
                <span className="kpi-card-value">{dashboardData.kpis.pendingMaintenanceCount}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-card-label">Unread Notifications</span>
                <span className="kpi-card-value">{dashboardData.kpis.unreadNotificationsCount > 0 ? dashboardData.kpis.unreadNotificationsCount : '—'}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'my-assets' && (
          <div>
            <h3>My Allocated Assets</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Tag</th>
                  <th>Category</th>
                  <th>Condition</th>
                  <th>Location</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {myAssets.length === 0 ? (
                  <tr><td colSpan="6">No assets currently allocated to you.</td></tr>
                ) : (
                  myAssets.map(asset => (
                    <tr key={asset.id}>
                      <td>{asset.name}</td>
                      <td>{asset.assetTag}</td>
                      <td>{asset.category?.name || '-'}</td>
                      <td>{asset.condition || '-'}</td>
                      <td>{asset.location || '-'}</td>
                      <td>
                        <button type="button" onClick={() => {
                          setSelectedAsset(asset)
                          fetchAssetHistory(asset.id)
                        }}>View History</button>
                        {' '}
                        <button type="button" onClick={() => handleRequestReturn(asset.id)}>Request Return</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {selectedAsset && assetHistory && (
              <div className="mt-5 rounded-lg border border-violet-200 p-4">
                <h4>Asset Details & History: {selectedAsset.name} ({selectedAsset.assetTag})</h4>
                <p><strong>Condition:</strong> {selectedAsset.condition || 'Unknown'}</p>
                <p><strong>Location:</strong> {selectedAsset.location || 'N/A'}</p>

                <h5>Allocation History</h5>
                <ul>
                  {assetHistory.allocations.length === 0 ? <li>No previous allocations.</li> : (
                    assetHistory.allocations.map(a => (
                      <li key={a.id}>
                        Allocated to {a.allocatedToEmployee?.name || a.allocatedToDepartment?.name || 'Unknown'} on {new Date(a.allocatedDate).toLocaleDateString()}
                        {a.actualReturnDate ? ` (Returned on ${new Date(a.actualReturnDate).toLocaleDateString()})` : ' (Current)'}
                      </li>
                    ))
                  )}
                </ul>

                <h5>Maintenance History</h5>
                <ul>
                  {assetHistory.maintenance.length === 0 ? <li>No maintenance history.</li> : (
                    assetHistory.maintenance.map(m => (
                      <li key={m.id}>
                        {m.issueDescription} - Status: <strong>{m.status}</strong> (Raised on {new Date(m.createdAt).toLocaleDateString()})
                      </li>
                    ))
                  )}
                </ul>
                <button type="button" onClick={() => { setSelectedAsset(null); setAssetHistory(null); }}>Close Panel</button>
              </div>
            )}
          </div>
        )}

        {tab === 'registry' && (
          <div>
            <h3>Complete Asset Registry</h3>
            <p>
              <input
                type="text"
                placeholder="Search by name, tag, or category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="mb-2"
              />
            </p>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Tag</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr><td colSpan="6">No assets match search parameters.</td></tr>
                ) : (
                  filteredAssets.map(asset => (
                    <tr key={asset.id}>
                      <td>{asset.name}</td>
                      <td>{asset.assetTag}</td>
                      <td>{asset.category?.name || '-'}</td>
                      <td>{asset.status}</td>
                      <td>{asset.location || '-'}</td>
                      <td>
                        <button type="button" onClick={() => {
                          setSelectedAsset(asset)
                          fetchAssetHistory(asset.id)
                        }}>View History</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'bookings' && (
          <div>
            <h3>Shared Resource Booking</h3>
            <form onSubmit={editingBooking ? handleUpdateBooking : handleCreateBooking}>
              <h4>{editingBooking ? 'Update Booking' : 'Book a Resource'}</h4>
              {!editingBooking && (
                <p>
                  <label>Select Resource:<br />
                    <select
                      value={bookingForm.resourceId}
                      onChange={e => setBookingForm({ ...bookingForm, resourceId: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Resource --</option>
                      {bookableResources.map(res => (
                        <option key={res.id} value={res.id}>{res.name} {res.linkedAsset ? `(${res.linkedAsset.assetTag})` : ''}</option>
                      ))}
                    </select>
                  </label>
                </p>
              )}
              <p>
                <label>Start Time:<br />
                  <input
                    type="datetime-local"
                    value={bookingForm.startTime}
                    onChange={e => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                    required
                  />
                </label>
              </p>
              <p>
                <label>End Time:<br />
                  <input
                    type="datetime-local"
                    value={bookingForm.endTime}
                    onChange={e => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                    required
                  />
                </label>
              </p>
              <button type="submit">{editingBooking ? 'Update Booking' : 'Book Resource'}</button>
              {editingBooking && (
                <button type="button" onClick={() => { setEditingBooking(null); setBookingForm({ resourceId: '', startTime: '', endTime: '' }) }}>Cancel Edit</button>
              )}
            </form>

            <BookingCalendar
              bookings={bookings}
              onSelectTimeSlot={date => {
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const day = String(date.getDate()).padStart(2, '0')
                setBookingForm(prev => ({
                  ...prev,
                  startTime: `${year}-${month}-${day}T09:00`,
                  endTime: `${year}-${month}-${day}T17:00`
                }))
              }}
            />

            <hr />
            <h4>My Bookings</h4>
            <table>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan="5">No bookings found.</td></tr>
                ) : (
                  bookings.map(bk => (
                    <tr key={bk.id}>
                      <td>{bk.resource?.name || 'Resource'}</td>
                      <td>{new Date(bk.startTime).toLocaleString()}</td>
                      <td>{new Date(bk.endTime).toLocaleString()}</td>
                      <td>{bk.status}</td>
                      <td>
                        {bk.status === 'upcoming' && (
                          <>
                            <button type="button" onClick={() => {
                              setEditingBooking(bk)
                              setBookingForm({
                                resourceId: bk.resource?.id || '',
                                startTime: new Date(bk.startTime).toISOString().slice(0, 16),
                                endTime: new Date(bk.endTime).toISOString().slice(0, 16)
                              })
                            }}>Reschedule</button>
                            {' '}
                            <button type="button" onClick={() => handleCancelBooking(bk.id)}>Cancel</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'transfers' && (
          <div>
            <h3>Initiate Asset Transfer Request</h3>
            <form onSubmit={handleCreateTransfer}>
              <h4>Request Asset Transfer</h4>
              <p>
                <label>Select Asset to Request:<br />
                  <select
                    value={transferForm.assetId}
                    onChange={e => setTransferForm({ ...transferForm, assetId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Asset --</option>
                    {myAssets.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.assetTag}) - My Allocated</option>
                    ))}
                    {allAssets.filter(a => !myAssets.some(ma => ma.id === a.id)).map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                    ))}
                  </select>
                </label>
              </p>
              <p>
                <label>Reason for Transfer:<br />
                  <textarea
                    value={transferForm.reason}
                    onChange={e => setTransferForm({ ...transferForm, reason: e.target.value })}
                    required
                  />
                </label>
              </p>
              <button type="submit">Submit Transfer Request</button>
            </form>

            <hr />
            <h4>My Transfer History / Pending Requests</h4>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Current Holder</th>
                  <th>Requested By</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 ? (
                  <tr><td colSpan="5">No transfer requests.</td></tr>
                ) : (
                  transfers.map(tr => (
                    <tr key={tr.id}>
                      <td>{tr.asset?.name} ({tr.asset?.assetTag})</td>
                      <td>{tr.currentAllocation?.allocatedToEmployee?.name || 'Unassigned'}</td>
                      <td>{tr.requestedBy?.name}</td>
                      <td>{tr.reason || '-'}</td>
                      <td>{tr.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'maintenance' && (
          <div>
            <h3>My Maintenance Requests</h3>
            <form onSubmit={handleRaiseMaintenance}>
              <h4>Raise Maintenance Request</h4>
              <p>
                <label>Select Your Allocated Asset:<br />
                  <select
                    value={maintenanceForm.assetId}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, assetId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Allocated Asset --</option>
                    {myAssets.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                    ))}
                  </select>
                </label>
              </p>
              <p>
                <label>Issue Description:<br />
                  <textarea
                    value={maintenanceForm.issueDescription}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, issueDescription: e.target.value })}
                    required
                  />
                </label>
              </p>
              <p>
                <label>Priority:<br />
                  <select
                    value={maintenanceForm.priority}
                    onChange={e => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </p>
              <button type="submit">Raise Request</button>
            </form>

            <hr />
            <h4>My Maintenance Requests History</h4>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceRequests.length === 0 ? (
                  <tr><td colSpan="4">No requests found.</td></tr>
                ) : (
                  maintenanceRequests.map(req => (
                    <tr key={req.id}>
                      <td>{req.asset?.name} ({req.asset?.assetTag})</td>
                      <td>{req.issueDescription}</td>
                      <td>{formatStatus(req.priority)}</td>
                      <td>{formatStatus(req.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'audits' && (
          <div>
            <h3>Audit Cycles Participation</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Scope Dept</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {auditCycles.length === 0 ? (
                  <tr><td colSpan="4">No assigned audit cycles.</td></tr>
                ) : (
                  auditCycles.map(cycle => (
                    <tr key={cycle.id}>
                      <td>{cycle.name}</td>
                      <td>{cycle.scopeDepartment?.name || 'All'}</td>
                      <td>{formatStatus(cycle.status)}</td>
                      <td>
                        <button type="button" onClick={() => {
                          setSelectedCycleId(cycle.id)
                          fetchAuditRecords(cycle.id)
                        }}>Verify Assets</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {selectedCycleId && (
              <div className="mt-5">
                <h4>Audit Records for Cycle</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Condition</th>
                      <th>Location</th>
                      <th>Result</th>
                      <th>Notes</th>
                      <th>Submit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRecords.map(rec => (
                      <tr key={rec.id}>
                        <td>{rec.asset?.name} ({rec.asset?.assetTag})</td>
                        <td>{rec.asset?.condition}</td>
                        <td>{rec.asset?.location}</td>
                        <td>{rec.result}</td>
                        <td>{rec.notes || '-'}</td>
                        <td>
                          {rec.result === 'pending' ? (
                            <button type="button" onClick={() => setAuditRecordForm({ ...auditRecordForm, recordId: rec.id })}>Submit Result</button>
                          ) : (
                            <span>Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {auditRecordForm.recordId && (
              <form onSubmit={handleSubmitAuditRecord} className="mt-5">
                <h4>Submit Verification Result</h4>
                <p>
                  <label>Result:<br />
                    <select
                      value={auditRecordForm.result}
                      onChange={e => setAuditRecordForm({ ...auditRecordForm, result: e.target.value })}
                      required
                    >
                      <option value="verified">Verified</option>
                      <option value="missing">Missing</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </label>
                </p>
                <p>
                  <label>Notes:<br />
                    <textarea
                      value={auditRecordForm.notes}
                      onChange={e => setAuditRecordForm({ ...auditRecordForm, notes: e.target.value })}
                    />
                  </label>
                </p>
                <button type="submit">Submit Verification</button>
                <button type="button" onClick={() => setAuditRecordForm({ recordId: '', result: 'verified', notes: '' })}>Cancel</button>
              </form>
            )}
          </div>
        )}

        {tab === 'notifications' && (
          <div>
            <h3>My Notifications</h3>
            <ul className="grid list-none gap-3 p-0">
              {notifications.length === 0 ? <li>No notifications found.</li> : (
                notifications.map(notif => (
                  <li key={notif.id} className="flex items-center justify-between rounded-lg border border-violet-200 bg-white p-3">
                    <div>
                      <p className={notif.isRead ? 'm-0 text-sm font-normal text-violet-700' : 'm-0 text-sm font-semibold text-violet-950'}>{notif.message}</p>
                      <small className="text-xs text-violet-500">{new Date(notif.createdAt).toLocaleString()}</small>
                    </div>
                    {!notif.isRead && (
                      <button type="button" onClick={() => handleMarkAsRead(notif.id)}>Mark Read</button>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
    </AppShell>
  )
}

export default App
