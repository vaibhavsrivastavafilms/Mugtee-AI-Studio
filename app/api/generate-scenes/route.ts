import { NextRequest, NextResponse } from 'next/server'

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
import { generateScenesViaStoryboardSop } from '@/lib/cinematic/storyboard-sop-engine'
import { normalizeProjectLanguage } from '@/lib/cinematic/language-detection'
import {
  parseVisualStyle,
  sceneVisualDefaults,
  visualStyleFromVirloContext,
} from '@/lib/cinematic/workflow-state'
import { sceneVisualFieldsFromVirlo } from '@/lib/virlo-engine/visual-language'
import { sanitizeSceneOnlyPrompt } from '@/lib/ai/prompts/youtube/storyboard-sop-prompt'

import { coerceDuration, coerceTopic, logError } from '@/lib/workspace/validation'

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

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null

    const idea = coerceTopic(raw?.idea ?? raw?.prompt ?? raw?.topic)
    const script = typeof raw?.script === 'string' ? raw.script : idea
    const sessionSeed =
      typeof raw?.sessionSeed === 'string' || typeof raw?.sessionSeed === 'number'
        ? raw.sessionSeed
        : idea

    const virlo = buildVirloContext(idea || script, { sessionSeed })
    const meta = virloMetadataFromContext(virlo)
    const niche = virlo.topicAnalysis.niche
    const language = normalizeProjectLanguage(raw?.language, idea || script)
    const visualStyle =
      parseVisualStyle(raw?.visualStyle, visualStyleFromVirloContext(virlo)) ??
      visualStyleFromVirloContext(virlo)

    const parsed = parseScriptIntoScenes(script, visualStyle)
    if (parsed && parsed.length >= 2) {
      const enriched = parsed.map((scene, i) => {
        const virloVisual = virlo.visuals[i]
        if (!virloVisual) return applyVisualStyleToScene(scene, visualStyle)
        const fields = sceneVisualFieldsFromVirlo(virloVisual)
        return applyVisualStyleToScene({ ...scene, ...fields }, visualStyle)
      })
      return NextResponse.json({
        scenes: ensureScenesHaveImagePrompts(enriched),
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

    if (process.env.OPENAI_API_KEY && script.trim().length > 40) {
      const sopScenes = await generateScenesViaStoryboardSop({
        script,
        language,
        durationSec,
        researchDocument,
        retentionMode: durationSec <= 60,
      })
      if (sopScenes && sopScenes.length >= 2) {
        const styled = sopScenes.map((scene, i) => {
          const virloVisual = virlo.visuals[i]
          const withVirlo = virloVisual
            ? { ...scene, ...sceneVisualFieldsFromVirlo(virloVisual) }
            : scene
          return applyVisualStyleToScene(withVirlo, visualStyle)
        })
        return NextResponse.json({
          scenes: ensureScenesHaveImagePrompts(styled),
          mock: false,
          niche,
          language,
          visualStyle,
          source: 'storyboard_sop',
          virlo: meta,
        })
      }
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = getOpenAIClient()
        const userPrompt = buildMugteeDirectorPrompt(virlo, script, visualStyle, language, {
          researchDocument,
        })

        const completion = await openai.chat.completions.create({
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
          return NextResponse.json({
            scenes: ensureScenesHaveImagePrompts(styled),
            mock: false,
            niche,
            language,
            visualStyle,
            source: 'openai',
            virlo: meta,
          })
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

    return NextResponse.json({
      scenes: ensureScenesHaveImagePrompts(
        mock.scenes.map((scene) => applyVisualStyleToScene(scene, visualStyle))
      ),
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
