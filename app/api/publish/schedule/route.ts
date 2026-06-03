import { NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { scheduleFromPhrase, schedulePublish } from '@/lib/publish/publish-engine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const b = parsed.body!
  const phrase = typeof b.phrase === 'string' ? b.phrase : undefined

  if (phrase) {
    const row = await scheduleFromPhrase(auth.supabase, auth.user!.id, phrase, {
      platform: String(b.platform ?? 'instagram'),
      caption: typeof b.caption === 'string' ? b.caption : undefined,
      contentRef: (b.contentRef as Record<string, unknown>) ?? {},
    })
    return NextResponse.json({ schedule: row })
  }

  const scheduledAt = b.scheduledAt ? new Date(String(b.scheduledAt)) : null
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'scheduledAt or phrase required' }, { status: 400 })
  }

  const row = await schedulePublish(auth.supabase, auth.user!.id, {
    platform: String(b.platform ?? 'instagram'),
    caption: typeof b.caption === 'string' ? b.caption : undefined,
    scheduledAt,
    contentRef: (b.contentRef as Record<string, unknown>) ?? {},
  })
  return NextResponse.json({ schedule: row })
}
