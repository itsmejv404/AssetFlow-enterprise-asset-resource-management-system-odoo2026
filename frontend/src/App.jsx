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

function AdminDashboardView({ session, onLogout }) {
  const [tab, setTab] = useState('departments')
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

    if (tab === 'departments') {
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

  const handleRegisterAsset = async (e) => {
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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {}
      <div style={{ width: '260px', borderRight: '1px solid #ccc', padding: '15px', boxSizing: 'border-box' }}>
        <h2>AssetFlow Admin</h2>
        <p><strong>User:</strong> {session.user.name}</p>
        <p><strong>Email:</strong> {session.user.email}</p>
        <button type="button" onClick={onLogout}>Logout</button>
        <hr />
        <h3>Navigation</h3>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('departments')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'departments' ? 'bold' : 'normal' }}>
              Departments
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('categories')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'categories' ? 'bold' : 'normal' }}>
              Asset Categories
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('employees')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'employees' ? 'bold' : 'normal' }}>
              Employees
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('assets')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'assets' ? 'bold' : 'normal' }}>
              Assets
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('allocations')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'allocations' ? 'bold' : 'normal' }}>
              Resource Allocations & Transfers
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('maintenance')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'maintenance' ? 'bold' : 'normal' }}>
              Maintenance Management
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('audits')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'audits' ? 'bold' : 'normal' }}>
              Audit Cycles
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('logs')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'logs' ? 'bold' : 'normal' }}>
              Audit Logs
            </button>
          </li>
        </ul>
        <hr />
        <p><Link to="/dashboard">Back to Dashboard Hub</Link></p>
      </div>

      {}
      <div style={{ flex: 1, padding: '20px', boxSizing: 'border-box' }}>
        {error ? <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p> : null}
        {success ? <p style={{ color: 'green' }}><strong>Success:</strong> {success}</p> : null}
        
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
          />
        )}
        {tab === 'categories' && (
          <CategoriesTab
            categories={categories}
            catForm={catForm}
            setCatForm={setCatForm}
            schemaFields={schemaFields}
            addSchemaField={addSchemaField}
            removeSchemaField={removeSchemaField}
            updateSchemaField={updateSchemaField}
            editingCat={editingCat}
            setEditingCat={setEditingCat}
            handleCreateCategory={handleCreateCategory}
            handleUpdateCategory={handleUpdateCategory}
            handleDeactivateCategory={handleDeactivateCategory}
            handleDeleteCategory={handleDeleteCategory}
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
            uploadFile={uploadFile}
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
          />
        )}
        {tab === 'logs' && <LogsTab logs={logs} />}
      </div>
    </div>
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

  if (role === 'admin') {
    return <AdminDashboardView session={session} onLogout={onLogout} />
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