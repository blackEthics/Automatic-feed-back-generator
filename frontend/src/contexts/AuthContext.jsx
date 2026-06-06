import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    const params = new URLSearchParams(window.location.search)
    if (params.get('login') === 'success') {
      window.history.replaceState({}, '', '/')
      checkAuth()
    }
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      const data = await res.json()
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function login() {
    const res = await fetch(`${API_URL}/auth/login`)
    const data = await res.json()
    window.location.href = data.url
  }

  async function logout() {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
