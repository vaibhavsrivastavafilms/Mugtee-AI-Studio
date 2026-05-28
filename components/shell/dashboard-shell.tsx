'use client'

import { ReactNode } from 'react'
import CinematicAppShell from '@/components/shell/cinematic-app-shell'

interface User {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

/** @deprecated Use CinematicAppShell — kept for import compatibility. */
export default function DashboardShell({
  children,
  user,
}: {
  children: ReactNode
  user: User
}) {
  return <CinematicAppShell user={user}>{children}</CinematicAppShell>
}
