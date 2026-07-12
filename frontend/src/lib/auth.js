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

export { AUTH_STORAGE_KEY, ROLE_ROUTES, clearAuth, getStoredAuth, roleToLabel, roleToRoute, saveAuth }
