export const REFERRAL_COOKIE_NAME = 'mugtee_referral_code'
export const REFERRAL_STORAGE_KEY = 'mugtee_referral_code'
export const REFERRAL_COOKIE_MAX_AGE_SEC = 30 * 24 * 60 * 60

export function referralInvitePath(code: string): string {
  return `/invite/${encodeURIComponent(code)}`
}

export function buildReferralLink(code: string, baseUrl?: string): string {
  const base = (baseUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')
  const path = referralInvitePath(code)
  if (base) return `${base}${path}`
  return `https://mugtee.in${path}`
}
