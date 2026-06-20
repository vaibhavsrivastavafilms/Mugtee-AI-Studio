import { NextResponse } from 'next/server'
import { getProviderHealthPublicSnapshot } from '@/lib/ai/providers/health'

export const dynamic = 'force-dynamic'

/** Internal diagnostics — provider health without exposing secrets. */
export async function GET() {
  const providers = getProviderHealthPublicSnapshot()
  return NextResponse.json(providers)
}
