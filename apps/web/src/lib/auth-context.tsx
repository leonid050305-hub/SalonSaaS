'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

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

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (!res.ok) { setLoading(false); return }
        const u = await res.json()
        setUser(u)

        // Загружаем первый салон тенанта
        const sRes = await fetch('/api/salons', { credentials: 'include' })
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

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
    setSalon(null)
    router.push('/login')
  }

  return <Ctx.Provider value={{ user, salon, loading, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
