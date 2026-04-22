"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"

export interface AuthUser {
  user_id: number
  email: string
  user_type: string
  status: string
  onboarding_completed: boolean
  student_id: number | null
  first_name: string | null
  last_name: string | null
  headline: string | null
  profile_picture_url: string | null
  company_id: number | null
  company_name: string | null
  logo_url: string | null
}

interface RegisterStudentData {
  email: string
  password: string
  first_name: string
  last_name: string
}

interface RegisterCompanyData {
  email: string
  password: string
  company_name: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  registerStudent: (data: RegisterStudentData) => Promise<{ success: boolean; error?: string }>
  registerCompany: (data: RegisterCompanyData) => Promise<{ success: boolean; error?: string }>
  updateUser: (user: AuthUser) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => ({ success: false }),
  registerStudent: async () => ({ success: false }),
  registerCompany: async () => ({ success: false }),
  updateUser: () => {},
  logout: () => {},
  isAuthenticated: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token")
    const savedUser = localStorage.getItem("auth_user")
    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem("auth_token")
        localStorage.removeItem("auth_user")
      }
    }
    setLoading(false)
  }, [])

  const _saveSession = useCallback(async (accessToken: string, userData: AuthUser) => {
    setToken(accessToken)
    setUser(userData)
    // Deprecating auth_token in localStorage, but keep it for immediate client-side compat before cookie is fully propagated if needed, or better, remove it completely. 
    // Wait, the client.ts now uses credentials: "include" so it works immediately too.
    localStorage.setItem("auth_token", accessToken)
    localStorage.setItem("auth_user", JSON.stringify(userData))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Login failed" }))
        return { success: false, error: err.detail || "Invalid email or password" }
      }

      const data = await res.json()
      await _saveSession(data.access_token, data.user)
      return { success: true }
    } catch (err) {
      return { success: false, error: "Network error. Please try again." }
    }
  }, [_saveSession])

  const registerStudent = useCallback(async (regData: RegisterStudentData) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register/student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(regData),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Registration failed" }))
        return { success: false, error: err.detail || "Registration failed" }
      }

      const data = await res.json()
      await _saveSession(data.access_token, data.user)
      return { success: true }
    } catch (err) {
      return { success: false, error: "Network error. Please try again." }
    }
  }, [_saveSession])

  const registerCompany = useCallback(async (regData: RegisterCompanyData) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register/company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(regData),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Registration failed" }))
        return { success: false, error: err.detail || "Registration failed" }
      }

      const data = await res.json()
      await _saveSession(data.access_token, data.user)
      return { success: true }
    } catch (err) {
      return { success: false, error: "Network error. Please try again." }
    }
  }, [_saveSession])

  const updateUser = useCallback((updatedUser: AuthUser) => {
    setUser(updatedUser)
    localStorage.setItem("auth_user", JSON.stringify(updatedUser))
  }, [])

  const logout = useCallback(() => {
    const userType = user?.user_type
    setToken(null)
    setUser(null)
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
    // Clear httpOnly cookie via backend
    fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" }).catch(console.error)
    
    if (userType === "admin") {
      router.push("/admin/login")
    } else if (userType === "company") {
      router.push("/company/login")
    } else {
      router.push("/student/login")
    }
  }, [router, user?.user_type])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        registerStudent,
        registerCompany,
        updateUser,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
