import { useState, useEffect, useCallback } from 'react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
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

// ─── Generic fetch hook ───────────────────────────────────────────────────────

export function useFetch<T>(url: string | null) {
  const [data, setData]       = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!url) return
    setLoading(true)
    setError(null)
    try {
      const d = await apiFetch<T>(url)
      setData(d)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => { reload() }, [reload])

  return { data, loading, error, reload }
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export function useAppointments(salonId: string | null, params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const url = salonId ? `/api/salons/${salonId}/appointments${qs}` : null
  return useFetch<{ appointments: any[]; total: number }>(url)
}

export async function createAppointment(salonId: string, data: unknown) {
  return apiFetch(`/api/salons/${salonId}/appointments`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAppointmentStatus(salonId: string, id: string, status: string) {
  return apiFetch(`/api/salons/${salonId}/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function cancelAppointment(salonId: string, id: string) {
  return apiFetch(`/api/salons/${salonId}/appointments/${id}`, { method: 'DELETE' })
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export function useStaff(salonId: string | null) {
  const url = salonId ? `/api/salons/${salonId}/staff` : null
  return useFetch<any[]>(url)
}

export async function createStaff(salonId: string, data: unknown) {
  return apiFetch(`/api/salons/${salonId}/staff`, { method: 'POST', body: JSON.stringify(data) })
}

export async function updateStaff(salonId: string, staffId: string, data: unknown) {
  return apiFetch(`/api/salons/${salonId}/staff/${staffId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

// ─── Services ─────────────────────────────────────────────────────────────────

export function useServices(salonId: string | null) {
  const url = salonId ? `/api/salons/${salonId}/services` : null
  return useFetch<any[]>(url)
}

export async function createService(salonId: string, data: unknown) {
  return apiFetch(`/api/salons/${salonId}/services`, { method: 'POST', body: JSON.stringify(data) })
}

export async function updateService(salonId: string, serviceId: string, data: unknown) {
  return apiFetch(`/api/salons/${salonId}/services/${serviceId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteService(salonId: string, serviceId: string) {
  return apiFetch(`/api/salons/${salonId}/services/${serviceId}`, { method: 'DELETE' })
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export function useClients(salonId: string | null, search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  const url = salonId ? `/api/salons/${salonId}/clients${qs}` : null
  return useFetch<{ clients: any[]; total: number }>(url)
}

export async function createClient(salonId: string, data: unknown) {
  return apiFetch(`/api/salons/${salonId}/clients`, { method: 'POST', body: JSON.stringify(data) })
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export function useDashboardStats(salonId: string | null) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: todayData, loading: l1, reload: r1 } = useFetch<{ appointments: any[]; total: number }>(
    salonId ? `/api/salons/${salonId}/appointments?date=${today}&limit=100` : null
  )
  const { data: clientsData, loading: l2 } = useFetch<{ total: number }>(
    salonId ? `/api/salons/${salonId}/clients` : null
  )

  const appointments = todayData?.appointments ?? []
  const completedToday = appointments.filter((a: any) => a.status === 'COMPLETED')
  const revenueToday   = completedToday.reduce((s: number, a: any) => s + Number(a.totalPrice), 0)

  return {
    loading: l1 || l2,
    reload: r1,
    todayCount:  todayData?.total ?? 0,
    revenueToday,
    clientsTotal: clientsData?.total ?? 0,
    completionRate: appointments.length
      ? Math.round((completedToday.length / appointments.length) * 100)
      : 0,
    todayAppointments: appointments,
  }
}
