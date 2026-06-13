import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import {
  auditReelsBucketWithServiceRole,
  runExportStorageAudit,
} from '@/lib/export/export-storage-audit.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Dev-only audit: Supabase reels upload, signed URL, retrieval, project persistence. */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available outside development' }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.response) {
    const bucketInfra = await auditReelsBucketWithServiceRole()
    return NextResponse.json(
      {
        tag: '[SUPABASE_UPLOAD_AUDIT]',
        verdict: 'BLOCKED',
        stages: {
          bucket_exists: bucketInfra,
          upload_permissions: { status: 'SKIP', detail: 'Requires authenticated session' },
          signed_url_generation: { status: 'SKIP', detail: 'Requires authenticated session' },
          object_retrieval: { status: 'SKIP', detail: 'Requires authenticated session' },
          project_update: { status: 'SKIP', detail: 'Requires authenticated session' },
        },
        failure: {
          rootCause: 'Not signed in — storage audit requires an authenticated user session',
          file: 'lib/auth/require-auth.ts',
          function: 'requireAuth',
          line: 20,
          fix: 'Sign in to the app, then call GET /api/dev/export-storage-audit from the same browser session, or set CI_E2E_EMAIL/CI_E2E_PASSWORD and run node scripts/dev/export-storage-audit.mjs.',
          confidence: 'High',
        },
      },
      { status: 401 }
    )
  }

  try {
    const result = await runExportStorageAudit(auth.user!.id)
    const status = result.verdict === 'PRODUCTION READY' ? 200 : 503
    return NextResponse.json(result, { status })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    return NextResponse.json(
      {
        tag: '[SUPABASE_UPLOAD_AUDIT]',
        verdict: 'BLOCKED',
        stages: {},
        failure: {
          rootCause: message,
          file: 'lib/export/export-storage-audit.server.ts',
          function: 'runExportStorageAudit',
          line: 0,
          fix: 'Inspect server logs and Supabase configuration.',
          confidence: 'Medium',
          stack: stack?.slice(0, 2000),
        },
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}
