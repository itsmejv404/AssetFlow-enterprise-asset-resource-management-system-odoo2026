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

export { apiRequest }
