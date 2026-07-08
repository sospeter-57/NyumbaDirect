import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User } from '../types'
import { api } from '../utils/api'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, role: string, name?: string, businessName?: string) => Promise<void>
  logout: () => void
  isLandlord: boolean
  isTenant: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token')
  )
  const [loading, setLoading] = useState(false)

  const storeAuth = useCallback((t: string, u: User) => {
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
    setToken(t)
    setUser(u)
  }, [])

  const login = useCallback(
    async (phone: string, password: string) => {
      setLoading(true)
      try {
        const res = await api.auth.login(phone, password)
        storeAuth(res.token, res.user)
      } finally {
        setLoading(false)
      }
    },
    [storeAuth]
  )

  const register = useCallback(
    async (phone: string, password: string, role: string, name?: string, businessName?: string) => {
      setLoading(true)
      try {
        const res = await api.auth.register(phone, password, role, name, businessName)
        storeAuth(res.token, res.user)
      } finally {
        setLoading(false)
      }
    },
    [storeAuth]
  )

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isLandlord: user?.role === 'landlord',
        isTenant: user?.role === 'tenant',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
