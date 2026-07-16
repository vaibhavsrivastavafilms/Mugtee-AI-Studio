import { NextResponse } from 'next/server'
import { getProviderHealthSnapshot } from '@/lib/ai/providers/health'

export const dynamic = 'force-dynamic'

/** Internal diagnostics — provider health without exposing secrets. */
export async function GET() {
  const providers = getProviderHealthSnapshot()
  return NextResponse.json(providers)
}
