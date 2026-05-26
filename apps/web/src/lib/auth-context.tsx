'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''
const PUBLIC_PATHS = ['/login', '/register', '/book']

interface User {
  id: string
  name: string
  email: string
  role: string
  tenantId: string
}

interface Salon {
  id: string
  name: string
  timezone: string
}

interface AuthCtx {
  user: User | null
  salon: Salon | null
  loading: boolean
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({ user: null, salon: null, loading: true, logout: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(null)
  const [salon, setSalon] = useState<Salon | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, { credentials: 'include' })
        if (!res.ok) { setLoading(false); return }
        const u = await res.json()
        setUser(u)

        const sRes = await fetch(`${API}/api/salons`, { credentials: 'include' })
        if (sRes.ok) {
          const salons = await sRes.json()
          if (salons.length > 0) setSalon(salons[0])
        }
      } catch {
        // не авторизован
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (loading) return
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
    if (!user && !isPublic) router.push('/login')
    if (user && pathname === '/login') router.push('/dashboard')
  }, [loading, user, pathname])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
    setSalon(null)
    router.push('/login')
  }

  return <Ctx.Provider value={{ user, salon, loading, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
