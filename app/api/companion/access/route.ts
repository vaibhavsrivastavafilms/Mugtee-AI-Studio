import { NextResponse } from 'next/server'
import { requireCompanionUser } from '@/lib/companion/api-helpers'
import { canAccessLiveCompanion, isCompanionExperimentalVoiceEnabled } from '@/lib/companion/access'

export const dynamic = 'force-dynamic'

/** GET — whether the signed-in user may use Live Companion surfaces. */
export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const user = auth.user!
  const enabled = canAccessLiveCompanion(user)

  return NextResponse.json({
    enabled,
    experimentalVoice: enabled && isCompanionExperimentalVoiceEnabled(),
  })
}
