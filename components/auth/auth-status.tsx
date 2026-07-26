'use client'

import { useAuthContext } from '@/components/auth/auth-provider'

type AuthStatusProps = {
  className?: string
}

/**
 * Visually subtle status for assistive tech / optional UI.
 * Never exposes configuration or provider errors.
 */
export function AuthStatus({ className }: AuthStatusProps) {
  const { ready, user, isDevelopmentMode } = useAuthContext()

  let label = 'Checking session'
  if (ready && isDevelopmentMode) label = 'Development mode'
  else if (ready && user) label = 'Signed in'
  else if (ready) label = 'Signed out'

  return (
    <p
      className={className ?? 'sr-only'}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {label}
    </p>
  )
}
