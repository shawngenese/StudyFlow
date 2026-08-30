/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from './supabase'

export const AUTH_ENABLED = !!supabase

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(AUTH_ENABLED)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      active = false
      authSub.subscription.unsubscribe()
    }
  }, [])

  const signInWithProvider = useCallback(async (provider) => {
    if (!supabase) return { error: new Error('Auth not configured') }
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/app` },
    })
  }, [])

  const sendOtp = useCallback(async (email) => {
    if (!supabase) return { error: new Error('Auth not configured') }
    return supabase.auth.signInWithOtp({
      email,
      // no emailRedirectTo — that switches Supabase into magic-link mode;
      // with none set, the sent email carries the numeric code ({{ .Token }})
      options: { shouldCreateUser: true },
    })
  }, [])

  const verifyOtp = useCallback(async ({ email, token }) => {
    if (!supabase) return { error: new Error('Auth not configured') }
    return supabase.auth.verifyOtp({ email, token, type: 'email' })
  }, [])

  const logout = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, loading, signInWithProvider, sendOtp, verifyOtp, logout }),
    [user, loading, signInWithProvider, sendOtp, verifyOtp, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="auth-loading">Loading…</div>
  if (AUTH_ENABLED && !isAuthenticated) return <Navigate to="/" replace />
  return children
}