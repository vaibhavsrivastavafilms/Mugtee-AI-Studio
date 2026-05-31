import { NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { isMotionPresetId } from '@/lib/motion/motion-presets'
import {
  motionDirectorToSceneMotion,
  rulesMotionDirector,
  sceneUsesFlicker,
  type MotionDirectorInput,
  type MotionDirectorOutput,
} from '@/lib/motion/motion-director-rules'
import type { SceneMotion } from '@/lib/motion/scene-motion-types'

type MotionDirectorRequest = {
  niche?: string
  script?: string
  mood?: string
  scene?: MotionDirectorInput['scene']
  sceneIndex?: number
  totalScenes?: number
  storyBible?: MotionDirectorInput['storyBible']
}

function parseOpenAiMotionJson(raw: string): Partial<MotionDirectorOutput> | null {
  const trimmed = raw.trim()
  const jsonBlock = trimmed.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonBlock) return null
  try {
    return JSON.parse(jsonBlock) as Partial<MotionDirectorOutput>
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MotionDirectorRequest
    const scene = body.scene
    if (!scene?.id && !scene?.title && !scene?.description) {
      return NextResponse.json({ error: 'Scene context is required' }, { status: 400 })
    }

    const sceneIndex = typeof body.sceneIndex === 'number' ? body.sceneIndex : 0
    const totalScenes = typeof body.totalScenes === 'number' ? body.totalScenes : 1

    const input: MotionDirectorInput = {
      niche: body.niche,
      script: body.script,
      mood: body.mood,
      scene,
      sceneIndex,
      totalScenes,
      storyBible: body.storyBible ?? null,
    }

    const rules = rulesMotionDirector(input)
    let output: MotionDirectorOutput = rules
    let source: 'rules' | 'openai' = 'rules'

    try {
      const openai = getOpenAIClient()
      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a cinematic motion director for short-form documentary reels. Return JSON only with keys: motionPreset (slug), cameraMovement, particleEffects (none|dust|fog|light_rays), intensity (0-100), transition (fade|cross_dissolve|cut), depthEnabled (boolean), zoomLevel (0.9-1.2). Prefer slow intentional camera moves.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              niche: body.niche,
              mood: body.mood ?? body.storyBible?.mood,
              scriptExcerpt: (body.script ?? '').slice(0, 600),
              scene: {
                title: scene.title,
                description: scene.description,
                cameraAngle: scene.cameraAngle,
                movementStyle: scene.movementStyle,
                lightingMood: scene.lightingMood,
                environment: scene.environment,
              },
              sceneIndex,
              totalScenes,
              allowedPresets: [
                'documentary_drift',
                'historical_push_in',
                'battle_tracking',
                'luxury_reveal',
                'emotional_close_up',
                'ancient_civilization',
                'push_in',
                'pull_out',
                'slow_pan_left',
                'slow_pan_right',
                'orbit',
                'depth_parallax',
                'subtle_zoom',
              ],
            }),
          },
        ],
      })

      const raw = completion.choices[0]?.message?.content?.trim()
      const parsed = raw ? parseOpenAiMotionJson(raw) : null
      if (parsed?.motionPreset && isMotionPresetId(parsed.motionPreset)) {
        output = {
          ...rules,
          ...parsed,
          motionPreset: parsed.motionPreset,
          source: 'openai',
        }
        source = 'openai'
      }
    } catch {
      /* OpenAI unavailable — rules fallback */
    }

    const mood = [
      body.mood,
      body.storyBible?.mood,
      scene.lightingMood,
      scene.environment,
      scene.description,
    ]
      .filter(Boolean)
      .join(' ')

    const sceneMotion: SceneMotion = motionDirectorToSceneMotion(output, sceneUsesFlicker(mood))

    return NextResponse.json({
      motionPreset: output.motionPreset,
      cameraMovement: output.cameraMovement,
      particleEffects: output.particleEffects,
      intensity: output.intensity,
      transition: output.transition,
      depthEnabled: output.depthEnabled,
      zoomLevel: output.zoomLevel,
      sceneMotion,
      source,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Motion director failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
