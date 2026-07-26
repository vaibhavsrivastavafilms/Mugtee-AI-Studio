/**
 * Log auth/config failures for developers only — never surface to end users.
 */
export function logAuthError(scope: string, error?: unknown): void {
  if (process.env.NODE_ENV !== 'development') return

  if (error === undefined) {
    console.warn(`[auth:${scope}]`)
    return
  }

  console.warn(`[auth:${scope}]`, error)
}
