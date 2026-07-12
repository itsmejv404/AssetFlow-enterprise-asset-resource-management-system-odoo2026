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
import { apiRequest } from './lib/api'
import { clearAuth, getStoredAuth, ROLE_ROUTES, roleToLabel, roleToRoute, saveAuth } from './lib/auth'

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
          {session.user.role === 'admin' && (
            <li style={{ marginBottom: '10px' }}>
              <button type="button" onClick={() => setTab('logs')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'logs' ? 'bold' : 'normal' }}>
                Audit Logs
              </button>
            </li>
          )}
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
            isAdmin={session.user.role === 'admin'}
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
        {tab === 'logs' && <LogsTab logs={logs} />}
      </div>
    </div>
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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ width: '250px', padding: '20px', boxSizing: 'border-box' }}>
        <h3>Dashboard Hub</h3>
        <p>Logged in as:<br /><strong>{session.user.name}</strong><br />({roleToLabel(session.user.role)})</p>
        <hr />
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('dashboard')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'dashboard' ? 'bold' : 'normal' }}>
              KPI Overview
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('assets')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'assets' ? 'bold' : 'normal' }}>
              Department Assets
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('allocations')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'allocations' ? 'bold' : 'normal' }}>
              Allocations & Transfers
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('maintenance')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'maintenance' ? 'bold' : 'normal' }}>
              Maintenance
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('audits')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'audits' ? 'bold' : 'normal' }}>
              Audits
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('bookings')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'bookings' ? 'bold' : 'normal' }}>
              Bookings
            </button>
          </li>
        </ul>
        <hr />
        <p><button type="button" onClick={onLogout} style={{ width: '100%' }}>Logout</button></p>
      </div>

      <div style={{ flex: 1, padding: '20px', boxSizing: 'border-box' }}>
        {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>}
        {success && <p style={{ color: 'green' }}><strong>Success:</strong> {success}</p>}

        {tab === 'dashboard' && dashboardData && (
          <div>
            <h3>Department KPI Metrics ({dashboardData.department})</h3>
            <ul>
              <li>Total Assets in Department: <strong>{dashboardData.kpis.assetsCount}</strong></li>
              <li>Active Allocations: <strong>{dashboardData.kpis.allocationsCount}</strong></li>
              <li>Pending Transfers: <strong>{dashboardData.kpis.pendingTransfersCount}</strong></li>
              <li>Pending Maintenance Requests: <strong>{dashboardData.kpis.pendingMaintenanceCount}</strong></li>
            </ul>
          </div>
        )}

        {tab === 'assets' && (
          <div>
            <h3>Department Assets</h3>
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      <td>{alloc.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <hr />
            <h4>Department Transfer Requests</h4>
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      <td>{tr.status}</td>
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
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      <td>{req.priority}</td>
                      <td>{req.status}</td>
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
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      <td>{cycle.status}</td>
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
              <div style={{ marginTop: '20px' }}>
                <h4>Audit Records for Cycle</h4>
                <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
              <form onSubmit={handleSubmitAuditRecord} style={{ marginTop: '20px' }}>
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

            <hr />
            <h4>Department & Personal Bookings</h4>
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
      </div>
    </div>
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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ width: '250px', padding: '20px', boxSizing: 'border-box' }}>
        <h3>Dashboard Hub</h3>
        <p>Logged in as:<br /><strong>{session.user.name}</strong><br />({roleToLabel(session.user.role)})</p>
        <hr />
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('dashboard')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'dashboard' ? 'bold' : 'normal' }}>
              KPI Overview
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('my-assets')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'my-assets' ? 'bold' : 'normal' }}>
              My Assets
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('registry')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'registry' ? 'bold' : 'normal' }}>
              Asset Registry
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('bookings')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'bookings' ? 'bold' : 'normal' }}>
              Book Resource
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('transfers')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'transfers' ? 'bold' : 'normal' }}>
              Initiate Transfer
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('maintenance')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'maintenance' ? 'bold' : 'normal' }}>
              Maintenance
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('audits')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'audits' ? 'bold' : 'normal' }}>
              Audits
            </button>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <button type="button" onClick={() => setTab('notifications')} style={{ width: '100%', textAlign: 'left', fontWeight: tab === 'notifications' ? 'bold' : 'normal' }}>
              Notifications {dashboardData?.kpis?.unreadNotificationsCount > 0 ? `(${dashboardData.kpis.unreadNotificationsCount})` : ''}
            </button>
          </li>
        </ul>
        <hr />
        <p><button type="button" onClick={onLogout} style={{ width: '100%' }}>Logout</button></p>
      </div>

      <div style={{ flex: 1, padding: '20px', boxSizing: 'border-box' }}>
        {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>}
        {success && <p style={{ color: 'green' }}><strong>Success:</strong> {success}</p>}

        {tab === 'dashboard' && dashboardData && (
          <div>
            <h3>Welcome back, {session.user.name}!</h3>
            <ul>
              <li>My Allocated Assets: <strong>{dashboardData.kpis.assetsCount}</strong></li>
              <li>Upcoming Bookings: <strong>{dashboardData.kpis.bookingsCount}</strong></li>
              <li>My Pending Maintenance: <strong>{dashboardData.kpis.pendingMaintenanceCount}</strong></li>
              <li>Unread Notifications: <strong>{dashboardData.kpis.unreadNotificationsCount}</strong></li>
            </ul>
          </div>
        )}

        {tab === 'my-assets' && (
          <div>
            <h3>My Allocated Assets</h3>
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {selectedAsset && assetHistory && (
              <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '15px' }}>
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
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginBottom: '10px' }}
              />
            </p>
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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

            <hr />
            <h4>My Bookings</h4>
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      <td>{req.priority}</td>
                      <td>{req.status}</td>
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
            <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      <td>{cycle.status}</td>
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
              <div style={{ marginTop: '20px' }}>
                <h4>Audit Records for Cycle</h4>
                <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
              <form onSubmit={handleSubmitAuditRecord} style={{ marginTop: '20px' }}>
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
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {notifications.length === 0 ? <li>No notifications found.</li> : (
                notifications.map(notif => (
                  <li key={notif.id} style={{
                    padding: '10px',
                    border: '1px solid #eee',
                    marginBottom: '10px',
                    backgroundColor: notif.isRead ? '#fcfcfc' : '#fff9f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: notif.isRead ? 'normal' : 'bold' }}>{notif.message}</p>
                      <small style={{ color: '#777' }}>{new Date(notif.createdAt).toLocaleString()}</small>
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
      </div>
    </div>
  )
}

export default App
