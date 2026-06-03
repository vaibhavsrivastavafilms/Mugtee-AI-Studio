import { NextRequest, NextResponse } from 'next/server'
import { requireCompanionUser, parseJsonObject } from '@/lib/companion/api-helpers'
import { learnFromWorkflowComplete } from '@/lib/memory/workflow-learning'
import type { CreatorEventType } from '@/lib/memory/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const b = parsed.body!
  const eventType =
    typeof b.eventType === 'string' ? (b.eventType as CreatorEventType) : undefined

  const result = await learnFromWorkflowComplete(auth.supabase, auth.user!.id, {
    projectId: typeof b.projectId === 'string' ? b.projectId : undefined,
    title: typeof b.title === 'string' ? b.title : undefined,
    hook: typeof b.hook === 'string' ? b.hook : undefined,
    theme: typeof b.theme === 'string' ? b.theme : undefined,
    tone: typeof b.tone === 'string' ? b.tone : undefined,
    platform: typeof b.platform === 'string' ? b.platform : undefined,
    format: typeof b.format === 'string' ? b.format : undefined,
    contentType: typeof b.contentType === 'string' ? b.contentType : undefined,
    campaign: typeof b.campaign === 'string' ? b.campaign : undefined,
    brandSlug: typeof b.brandSlug === 'string' ? b.brandSlug : undefined,
    brandDisplayName: typeof b.brandDisplayName === 'string' ? b.brandDisplayName : undefined,
    hookRegens: typeof b.hookRegens === 'number' ? b.hookRegens : undefined,
    scriptRegens: typeof b.scriptRegens === 'number' ? b.scriptRegens : undefined,
    scriptExcerpt: typeof b.scriptExcerpt === 'string' ? b.scriptExcerpt : undefined,
    eventType,
  })

  return NextResponse.json(result)
}
