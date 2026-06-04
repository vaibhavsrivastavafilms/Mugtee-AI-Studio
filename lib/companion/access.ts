import { isAdminUser } from '@/lib/admin/is-admin'

/** Public rollout — set NEXT_PUBLIC_COMPANION_ENABLED=true in env. Default off. */
export function isCompanionPublicEnabled(): boolean {
  return process.env.NEXT_PUBLIC_COMPANION_ENABLED === 'true'
}

/** Experimental voice (hands-free, mugtee-os floating STT) — default off. */
export function isCompanionExperimentalVoiceEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_COMPANION_EXPERIMENTAL_VOICE === 'true' ||
    process.env.COMPANION_EXPERIMENTAL_VOICE === 'true'
  )
}

function parseEnvList(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Beta testers — BETA_TESTER_* env lists or user_metadata.beta_tester === true. */
export function isBetaTesterUser(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined
): boolean {
  if (!user?.id) return false

  if (user.user_metadata?.beta_tester === true) return true

  const ids = parseEnvList(process.env.BETA_TESTER_USER_IDS)
  if (ids.includes(user.id)) return true

  const email = (user.email || '').trim().toLowerCase()
  if (!email) return false

  const emails = parseEnvList(process.env.BETA_TESTER_EMAILS).map((e) => e.toLowerCase())
  return emails.includes(email)
}

/** Live Companion routes and nav — env flag, admin, or beta tester. */
export function canAccessLiveCompanion(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined
): boolean {
  if (isCompanionPublicEnabled()) return true
  if (isAdminUser(user)) return true
  return isBetaTesterUser(user)
}
