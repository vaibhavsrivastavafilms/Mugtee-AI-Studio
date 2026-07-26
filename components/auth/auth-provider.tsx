'use client'

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import {
  useAuthHydration,
  type AuthHydrationState,
} from '@/lib/auth/use-auth-hydration'
import type { AuthRuntimeMode } from '@/lib/auth/is-auth-configured'

export type AuthContextValue = AuthHydrationState & {
  mode: AuthRuntimeMode
  isDevelopmentMode: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const hydration = useAuthHydration()

  const value = useMemo<AuthContextValue>(() => {
    const isDevelopmentMode = !hydration.authConfigured
    return {
      ...hydration,
      mode: isDevelopmentMode ? 'development' : 'production',
      isDevelopmentMode,
    }
  }, [hydration])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return ctx
}
