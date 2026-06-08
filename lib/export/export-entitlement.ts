/**
 * Export entitlement bypass for local development and QA.
 * Preserves billing/limit architecture — gates short-circuit when unlocked.
 *
 * Set NEXT_PUBLIC_DEV_UNLOCK_EXPORT=true in .env.local to force unlock in any NODE_ENV.
 */

/** Bypass plan, subscription, credit, and usage-cap export gates. */
export function isDevExportUnlocked(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEV_UNLOCK_EXPORT === 'true' ||
    process.env.NODE_ENV === 'development'
  )
}

/** Usage limits for export-related metrics (exports + renders). */
export function isExportUsageLimitBypassed(): boolean {
  return isDevExportUnlocked()
}

/** MP4 compile allowed for the user's plan (not asset/readiness checks). */
export function isMp4ExportEntitled(
  planType: string,
  options?: { trialActive?: boolean; isUnlimited?: boolean }
): boolean {
  if (isDevExportUnlocked()) return true
  if (options?.isUnlimited || options?.trialActive) return true
  const normalized = String(planType || 'FREE').toUpperCase()
  return normalized === 'PRO' || normalized === 'CREATOR' || normalized === 'PRO_TRIAL'
}
