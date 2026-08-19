import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { USER_IDEA_MAX_CHARS } from '@/lib/v7/creative-planning-validation'
import { getV7Production, listV7Productions } from '@/lib/v7/db.server'
import { bootstrapV7Production } from '@/lib/v7/orchestrator.server'
import { scheduleV7ProductionBackgroundDrive } from '@/lib/v7/background-driver.server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import { buildV7ProductionErrorResponse } from '@/lib/v7/api-errors.server'
import type { V7RapidBrief } from '@/types/v7/production'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function sanitizeRapidBrief(input: unknown): V7RapidBrief | null {
  if (!input || typeof input !== 'object') return null
  const src = input as Partial<V7RapidBrief>
  if (!src.duration || !src.colorTreatment || !src.voiceover || !src.musicMode || !src.editingStyle || !src.ending || !src.brandingAssets) {
    return null
  }
  return {
    duration: String(src.duration),
    visualStyle: Array.isArray(src.visualStyle) ? src.visualStyle.map((item) => String(item)).slice(0, 4) : [],
    colorTreatment: String(src.colorTreatment),
    voiceover: src.voiceover,
    voiceStyle: src.voiceStyle ? String(src.voiceStyle) : null,
    musicMode: src.musicMode,
    musicMood: src.musicMood ? String(src.musicMood) : null,
    mood: Array.isArray(src.mood) ? src.mood.map((item) => String(item)).slice(0, 3) : [],
    editingStyle: String(src.editingStyle),
    cameraStyle: src.cameraStyle ? String(src.cameraStyle) : null,
    ending: String(src.ending),
    brandingAssets: src.brandingAssets,
    smartPromptFocus: src.smartPromptFocus ? String(src.smartPromptFocus) : null,
  }
}

function mergePromptWithRapidBrief(idea: string, rapidBrief: V7RapidBrief | null): string {
  if (!rapidBrief) return idea
  const style = rapidBrief.visualStyle.length > 0 ? rapidBrief.visualStyle.join(', ') : 'AI-decide'
  const mood = rapidBrief.mood.length > 0 ? rapidBrief.mood.join(', ') : 'AI-decide'
  const lines = [
    `Duration: ${rapidBrief.duration}`,
    `Visual Style: ${style}`,
    `Colour Treatment: ${rapidBrief.colorTreatment}`,
    `Voice-over: ${rapidBrief.voiceover}${rapidBrief.voiceStyle ? ` (${rapidBrief.voiceStyle})` : ''}`,
    `Music: ${rapidBrief.musicMode}${rapidBrief.musicMood ? ` (${rapidBrief.musicMood})` : ''}`,
    `Audience Mood: ${mood}`,
    `Editing: ${rapidBrief.editingStyle}`,
    `Camera: ${rapidBrief.cameraStyle ?? 'AI-decide'}`,
    `Ending: ${rapidBrief.ending}`,
    `Branding Assets: ${rapidBrief.brandingAssets}`,
    rapidBrief.smartPromptFocus ? `Prompt Focus: ${rapidBrief.smartPromptFocus}` : null,
  ].filter(Boolean)
  return `${idea}\n\nCreative Preferences:\n- ${lines.join('\n- ')}`
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const productions = await listV7Productions(supabase, user.id)
    return NextResponse.json({ ok: true, productions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list productions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let productionId: string | undefined

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in to create a film.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as {
      idea?: string
      productionId?: string
      rapidBrief?: V7RapidBrief
    } | null

    const idea = body?.idea?.trim() ?? ''
    if (idea.length < 8) {
      return NextResponse.json(
        { error: 'Describe your idea in at least 8 characters.' },
        { status: 400 }
      )
    }
    if (idea.length > USER_IDEA_MAX_CHARS) {
      return NextResponse.json(
        { error: `Describe your idea in ${USER_IDEA_MAX_CHARS} characters or fewer.` },
        { status: 400 }
      )
    }

    const rapidBrief = sanitizeRapidBrief(body?.rapidBrief)
    const promptForPipeline = mergePromptWithRapidBrief(idea, rapidBrief)

    if (!body?.productionId) {
      const blocked = await guardUsageLimit(user.id, 'generations')
      if (blocked) return blocked
    }

    const snapshot = await bootstrapV7Production({
      supabase,
      userId: user.id,
      prompt: promptForPipeline,
      productionId: body?.productionId,
    })

    productionId = snapshot.production.id

    scheduleV7ProductionBackgroundDrive({
      productionId: snapshot.production.id,
      userId: user.id,
    })

    if (!body?.productionId) {
      await trackUsageMetric(user.id, 'generations')
      await trackUsageMetric(user.id, 'projects')
    }

    return NextResponse.json({
      ok: true,
      productionId: snapshot.production.id,
      timeline: snapshot.timeline,
      brief: snapshot.production.creative_brief,
    })
  } catch (error) {
    const { status, body } = buildV7ProductionErrorResponse(error, {
      productionId,
      stage: 'idea',
    })
    return NextResponse.json(body, { status })
  }
}
