import { NextResponse } from 'next/server'

import { getOpenRouterTextProviderHealth } from '@/lib/ai/providers/openrouter/health'

export const dynamic = 'force-dynamic'

/** OpenRouter text provider health — no secrets exposed. */
export async function GET() {
  const health = await getOpenRouterTextProviderHealth()
  return NextResponse.json(health)
}
