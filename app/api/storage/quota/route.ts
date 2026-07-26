import { NextResponse } from 'next/server'
import { getStorageQuotaSnapshot } from '@/lib/storage/quota-failsafe.server'
import {
  runRetentionCleanup,
  type RetentionCleanupResult,
} from '@/lib/storage/retention-cleanup.server'

export const dynamic = 'force-dynamic'

/** Storage quota snapshot for ops / admin tooling. Never blocks Auth routes. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const cleanup = url.searchParams.get('cleanup') === '1'
  const dryRun = url.searchParams.get('dryRun') !== '0'

  const snapshot = await getStorageQuotaSnapshot()

  let cleanupResult: RetentionCleanupResult | null = null
  if (cleanup && (snapshot.shouldAutoCleanTemp || !snapshot.restrictedByProvider)) {
    cleanupResult = await runRetentionCleanup({ dryRun, maxDeletes: 200 })
  }

  if (process.env.NODE_ENV === 'development') {
    console.info('[storage-quota]', snapshot, cleanupResult)
  }

  return NextResponse.json({
    snapshot: {
      level: snapshot.level,
      allowNewRenders: snapshot.allowNewRenders,
      shouldWarnAdmins: snapshot.shouldWarnAdmins,
      shouldAutoCleanTemp: snapshot.shouldAutoCleanTemp,
      preserveAuth: snapshot.preserveAuth,
      detail: snapshot.detail,
      usedRatio: snapshot.usedRatio,
      restrictedByProvider: snapshot.restrictedByProvider,
    },
    cleanup: cleanupResult,
  })
}
