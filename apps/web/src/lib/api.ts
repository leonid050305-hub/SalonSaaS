const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Ошибка сервера' }))
    throw new Error(err.error ?? 'Ошибка сервера')
  }
  return res.json()
}

export const api = {
  get:    <T>(path: string) => req<T>(path),
  post:   <T>(path: string, body: unknown) => req<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => req<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)               => req<T>(path, { method: 'DELETE' }),
}

// ─── Typed API calls ──────────────────────────────────────────────────────────

export const authApi = {
  login:    (email: string, password: string) => api.post('/api/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => api.post('/api/auth/register', { name, email, password }),
  logout:   () => api.post('/api/auth/logout', {}),
  me:       () => api.get('/api/auth/me'),
}

export const appointmentsApi = {
  list: (salonId: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return api.get(`/api/salons/${salonId}/appointments${qs}`)
  },
  create: (salonId: string, data: unknown) => api.post(`/api/salons/${salonId}/appointments`, data),
  updateStatus: (salonId: string, id: string, status: string) =>
    api.patch(`/api/salons/${salonId}/appointments/${id}/status`, { status }),
  cancel: (salonId: string, id: string) => api.delete(`/api/salons/${salonId}/appointments/${id}`),
}

export const staffApi = {
  list:   (salonId: string) => api.get(`/api/salons/${salonId}/staff`),
  create: (salonId: string, data: unknown) => api.post(`/api/salons/${salonId}/staff`, data),
  update: (salonId: string, staffId: string, data: unknown) => api.patch(`/api/salons/${salonId}/staff/${staffId}`, data),
}

export const servicesApi = {
  list:   (salonId: string) => api.get(`/api/salons/${salonId}/services`),
  create: (salonId: string, data: unknown) => api.post(`/api/salons/${salonId}/services`, data),
  update: (salonId: string, serviceId: string, data: unknown) => api.patch(`/api/salons/${salonId}/services/${serviceId}`, data),
  delete: (salonId: string, serviceId: string) => api.delete(`/api/salons/${salonId}/services/${serviceId}`),
}

export const clientsApi = {
  list:    (salonId: string, search?: string) => api.get(`/api/salons/${salonId}/clients${search ? `?search=${search}` : ''}`),
  create:  (salonId: string, data: unknown) => api.post(`/api/salons/${salonId}/clients`, data),
  history: (salonId: string, clientId: string) => api.get(`/api/salons/${salonId}/clients/${clientId}/history`),
}
