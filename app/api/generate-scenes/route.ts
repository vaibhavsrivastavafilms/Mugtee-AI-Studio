import { NextRequest, NextResponse } from 'next/server'

import { createCachedOpenAIChatCompletion } from '@/lib/ai/cached-openai-chat.server'
import { getOpenAIClient } from '@/lib/ai/openai-client'

import {
  buildMockCinematicOutput,
  buildSceneImagePrompt,
  ensureScenesHaveImagePrompts,
  normalizeCinematicOutput,
} from '@/lib/cinematic/generation'

import { buildVirloContext, virloMetadataFromContext } from '@/lib/virlo-engine'
import { buildVirloSystemPrompt } from '@/lib/virlo-engine/virlo-prompt'
import {
  applyVisualStyleToScene,
  buildMugteeDirectorPrompt,
} from '@/lib/cinematic/mugtee-director-engine'
import { runStoryboardSop } from '@/lib/cinematic/storyboard-sop-engine'
import { normalizeProjectLanguage } from '@/lib/cinematic/language-detection'
import { normalizeDirectorMode } from '@/lib/cinematic/director-modes'
import {
  buildStoryboardProjectFields,
  storyboardScenesToGeneratedScenes,
  type StoryboardScene,
} from '@/types/storyboard'
import {
  parseVisualStyle,
  sceneVisualDefaults,
  visualStyleFromVirloContext,
} from '@/lib/cinematic/workflow-state'
import { sceneVisualFieldsFromVirlo } from '@/lib/virlo-engine/visual-language'
import { sanitizeSceneOnlyPrompt } from '@/lib/ai/prompts/youtube/storyboard-sop-prompt'
import {
  applyBlueprintsToScenes,
  buildBlueprintsForScenes,
  parseOutputAlignmentControls,
} from '@/lib/cinematic/scene-blueprint'
import { validateSequenceCoherence } from '@/lib/cinematic/output-alignment'

import { normalizeContentBrief } from '@/lib/content-director/content-brief'
import { coerceDuration, coerceTopic, logError } from '@/lib/workspace/validation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  FeatureUsageFeatures,
  parseFeatureUsageProjectId,
  trackFeatureUsage,
} from '@/lib/analytics/feature-usage'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'

export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

function parseScriptIntoScenes(
  script: string,
  visualStyle: ReturnType<typeof visualStyleFromVirloContext>
) {
  const defaults = sceneVisualDefaults(visualStyle)
  const blocks = script.split(/\n\s*\n/).filter((b) => b.trim().length > 8)

  if (blocks.length < 2) return null

  return blocks.slice(0, 8).map((block, index) => {
    const visual = block.match(/Visual:\s*([^\n]+)/i)?.[1]?.trim()
    const voice = block.match(/Voiceover:\s*([^\n]+)/i)?.[1]?.trim()
    const title = block.match(/Scene\s+(\d+)/i)?.[0] || `Scene ${index + 1}`

    const description = voice || visual || block.slice(0, 200)
    const sceneOnly = sanitizeSceneOnlyPrompt(visual || description.slice(0, 200))
    const base = {
      id: `scene-${index + 1}`,
      title,
      description,
      duration: 4,
      visualPrompt: sceneOnly,
      imagePrompt: sceneOnly,
      ...defaults,
    }
    return { ...base, imagePrompt: buildSceneImagePrompt(base) }
  })
}

function parsePrecomputedStoryboard(raw: unknown): StoryboardScene[] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null
  const scenes: StoryboardScene[] = []
  raw.forEach((item, i) => {
    if (!item || typeof item !== 'object') return
    const row = item as Record<string, unknown>
    const scriptLines = String(row.scriptLines ?? row.description ?? '').trim()
    const imagePrompt = String(row.imagePrompt ?? row.visualPrompt ?? '').trim()
    if (!scriptLines && !imagePrompt) return
    const charactersRaw = row.characters
    scenes.push({
      id: String(row.id ?? `scene-${i + 1}`),
      scriptLines,
      imagePrompt: sanitizeSceneOnlyPrompt(imagePrompt || scriptLines.slice(0, 200)),
      visualFocus: String(row.visualFocus ?? '').trim(),
      location: String(row.location ?? '').trim(),
      characters: Array.isArray(charactersRaw)
        ? charactersRaw.filter((c): c is string => typeof c === 'string')
        : [],
      action: String(row.action ?? '').trim(),
      emotion: String(row.emotion ?? '').trim(),
      duration: typeof row.duration === 'number' ? row.duration : 4,
    })
  })
  return scenes.length >= 2 ? scenes : null
}

function storyboardResponseExtras(
  sop: Awaited<ReturnType<typeof runStoryboardSop>>
): Record<string, unknown> {
  if (!sop) return {}
  return {
    storyboardScenes: sop.storyboardScenes,
    storyboardPrompts: sop.storyboardPrompts,
    sceneCount: sop.sceneCount,
    visualTimeline: sop.visualTimeline,
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const blocked = await guardUsageLimit(user.id, 'generations')
      if (blocked) return blocked
    }

    const finish = async (body: Record<string, unknown>) => {
      if (user) {
        await trackUsageMetric(user.id, 'generations')
        void trackFeatureUsage(
          user.id,
          FeatureUsageFeatures.STORYBOARD_GENERATION,
          parseFeatureUsageProjectId(raw)
        )
      }
      return NextResponse.json(body)
    }

    const idea = coerceTopic(raw?.idea ?? raw?.prompt ?? raw?.topic)
    const script = typeof raw?.script === 'string' ? raw.script : idea
    const sessionSeed =
      typeof raw?.sessionSeed === 'string' || typeof raw?.sessionSeed === 'number'
        ? raw.sessionSeed
        : idea

    const virlo = buildVirloContext(idea || script, { sessionSeed })
    const meta = virloMetadataFromContext(virlo)
    const niche = virlo.topicAnalysis.niche
    const language = normalizeProjectLanguage(raw?.language)
    const directorMode = normalizeDirectorMode(raw?.directorMode)
    const visualStyle =
      parseVisualStyle(raw?.visualStyle, visualStyleFromVirloContext(virlo)) ??
      visualStyleFromVirloContext(virlo)

    const contentBrief = normalizeContentBrief(raw?.contentBrief ?? raw?.content_brief)
    const outputAlignmentControls = parseOutputAlignmentControls(
      raw?.outputAlignmentControls ?? raw?.output_alignment_controls
    )

    function finishWithBlueprints(
      scenes: import('@/lib/cinematic/generation').GeneratedScene[],
      characterDescription: string,
      extra: Record<string, unknown>
    ) {
      const blueprints = buildBlueprintsForScenes(scenes, {
        script,
        characterDescription,
        visualStyle,
        controls: outputAlignmentControls,
      })
      const aligned = applyBlueprintsToScenes(scenes, blueprints)
      const sequenceCoherence = validateSequenceCoherence(blueprints)
      return finish({
        scenes: ensureScenesHaveImagePrompts(aligned),
        sceneBlueprints: blueprints,
        sequenceCoherence,
        outputAlignmentControls,
        ...extra,
      })
    }

    const parsed = parseScriptIntoScenes(script, visualStyle)
    if (parsed && parsed.length >= 2) {
      const enriched = parsed.map((scene, i) => {
        const virloVisual = virlo.visuals[i]
        if (!virloVisual) return applyVisualStyleToScene(scene, visualStyle)
        const fields = sceneVisualFieldsFromVirlo(virloVisual)
        return applyVisualStyleToScene({ ...scene, ...fields }, visualStyle)
      })
      const characterDescription =
        enriched[0]?.description?.slice(0, 120) ?? ''
      return finishWithBlueprints(enriched, characterDescription, {
        mock: false,
        niche,
        language,
        visualStyle,
        source: 'script_parse',
        virlo: meta,
      })
    }

    const durationSec = coerceDuration(raw?.duration ?? virlo.duration)
    const researchDocument =
      typeof raw?.researchDocument === 'string' ? raw.researchDocument : undefined

    const precomputed = parsePrecomputedStoryboard(raw?.storyboardScenes)
    if (precomputed) {
      const baseScenes = storyboardScenesToGeneratedScenes(precomputed)
      const styled = baseScenes.map((scene, i) => {
        const virloVisual = virlo.visuals[i]
        const withVirlo = virloVisual
          ? { ...scene, ...sceneVisualFieldsFromVirlo(virloVisual) }
          : scene
        return applyVisualStyleToScene(withVirlo, visualStyle)
      })
      return finishWithBlueprints(
        styled,
        styled[0]?.description?.slice(0, 120) ?? '',
        {
          mock: false,
          niche,
          language,
          visualStyle,
          source: 'storyboard_sop',
          ...storyboardResponseExtras(buildStoryboardProjectFields(precomputed)),
          virlo: meta,
        }
      )
    }

    if (process.env.OPENAI_API_KEY && script.trim().length > 40) {
      const sopResult = await runStoryboardSop(script, durationSec, {
        language,
        researchDocument,
        retentionMode: durationSec <= 60,
        directorMode,
      })
      if (sopResult && sopResult.storyboardScenes.length >= 2) {
        const sopScenes = storyboardScenesToGeneratedScenes(sopResult.storyboardScenes)
        const styled = sopScenes.map((scene, i) => {
          const virloVisual = virlo.visuals[i]
          const withVirlo = virloVisual
            ? { ...scene, ...sceneVisualFieldsFromVirlo(virloVisual) }
            : scene
          return applyVisualStyleToScene(withVirlo, visualStyle)
        })
        return finishWithBlueprints(
          styled,
          styled[0]?.description?.slice(0, 120) ?? '',
          {
            mock: false,
            niche,
            language,
            visualStyle,
            source: 'storyboard_sop',
            ...storyboardResponseExtras(sopResult),
            virlo: meta,
          }
        )
      }
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = getOpenAIClient()
        const userPrompt = buildMugteeDirectorPrompt(virlo, script, visualStyle, language, {
          researchDocument,
          directorMode,
          contentBrief,
        })

        const completion = await createCachedOpenAIChatCompletion(openai, {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: buildVirloSystemPrompt() },
            { role: 'user', content: userPrompt },
          ],
        })

        const content = completion.choices[0]?.message?.content || '{}'
        const json = JSON.parse(content) as { scenes?: unknown[] }

        const normalized = normalizeCinematicOutput(
          { scenes: json.scenes, script },
          { topic: idea, duration: virlo.duration, tone: virlo.tone, niche }
        )

        if (normalized.scenes.length >= 2) {
          const styled = normalized.scenes.map((scene) =>
            applyVisualStyleToScene(scene, visualStyle)
          )
          return finishWithBlueprints(
            styled,
            styled[0]?.description?.slice(0, 120) ?? '',
            {
              mock: false,
              niche,
              language,
              visualStyle,
              source: 'openai',
              virlo: meta,
            }
          )
        }
      } catch (err) {
        logError('generate-scenes.openai', err)
      }
    }

    const mock = buildMockCinematicOutput({
      topic: idea || 'Untitled cinematic story',
      tone: virlo.tone,
      duration: virlo.duration,
      niche,
      virloContext: virlo,
    })

    const mockScenes = mock.scenes.map((scene) =>
      applyVisualStyleToScene(scene, visualStyle)
    )
    return finishWithBlueprints(mockScenes, '', {
      mock: true,
      niche,
      language,
      visualStyle,
      source: 'fallback',
      virlo: meta,
    })
  } catch (err) {
    logError('generate-scenes', err)
    return NextResponse.json({ error: 'Scene generation paused' }, { status: 500 })
  }
}
