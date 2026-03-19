const API_BASE = import.meta.env.VITE_API_BASE || ''

async function request(path, options = {}) {
  const token = localStorage.getItem('adminToken')
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `request failed: ${response.status}`)
  }

  return response.json()
}

export function fetchContent() {
  return request('/api/content')
}

export function submitInquiry(payload) {
  return request('/api/inquiries', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function saveContent(content) {
  return request('/api/content', {
    method: 'PUT',
    body: JSON.stringify(content),
  })
}

export function fetchCaptcha() {
  return request('/api/captcha')
}

export function loginAdmin(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchMe() {
  return request('/api/auth/me')
}

export function logoutAdmin() {
  return request('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function uploadMedia(file) {
  const body = new FormData()
  body.append('file', file)
  return request('/api/media/upload', {
    method: 'POST',
    body,
  })
}

export function listMedia() {
  return request('/api/media')
}

export function removeMedia(filename) {
  return request(`/api/media/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  })
}
