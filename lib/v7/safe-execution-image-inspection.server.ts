import 'server-only'

import { fetchWithTimeout } from '@/lib/ai/providers/shared'
import {
  getOpenRouterHeaders,
  hasOpenRouterApiKey,
  OPENROUTER_CHAT_COMPLETIONS_URL,
} from '@/lib/ai/providers/openrouter/client'
import type { V7SceneImageSpec } from '@/lib/v7/image-prompt-spec.core'
import {
  V7_SCENE_8_FORBIDDEN_POSITIVE,
  V7_SCENE_STORY_REQUIREMENTS,
} from '@/lib/v7/safe-execution-core'

export type V7SceneImageInspectionCheck = 'PASS' | 'FAIL'

export type V7SceneImageInspectionReport = {
  requiredElements: V7SceneImageInspectionCheck
  forbiddenElements: V7SceneImageInspectionCheck
  storyAlignment: V7SceneImageInspectionCheck
  composition: V7SceneImageInspectionCheck
  characterConsistency: V7SceneImageInspectionCheck
  locationConsistency: V7SceneImageInspectionCheck
  objectConsistency: V7SceneImageInspectionCheck
  overall: V7SceneImageInspectionCheck
  reasoning: string
  inspected: boolean
  inspectionMethod: 'openrouter_vision' | 'manual_required'
}

async function downloadImageAsDataUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) {
    throw new Error(`Failed to download generated image (${res.status})`)
  }
  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png'
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length < 512) {
    throw new Error('Downloaded image is empty or too small')
  }
  return `data:${contentType};base64,${buffer.toString('base64')}`
}

function parseInspectionJson(raw: string): Partial<V7SceneImageInspectionReport> {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return {}
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Partial<V7SceneImageInspectionReport>
  } catch {
    return {}
  }
}

function normalizeCheck(value: unknown): V7SceneImageInspectionCheck {
  return String(value).toUpperCase() === 'PASS' ? 'PASS' : 'FAIL'
}

export async function inspectGeneratedSceneImage(params: {
  imageUrl: string
  spec: V7SceneImageSpec
  sceneNumber: number
}): Promise<V7SceneImageInspectionReport> {
  const requirements = V7_SCENE_STORY_REQUIREMENTS[params.sceneNumber] ?? []
  const forbiddenPositive =
    params.sceneNumber === 8
      ? V7_SCENE_8_FORBIDDEN_POSITIVE
      : params.spec.forbiddenElements.slice(0, 12)

  if (!hasOpenRouterApiKey()) {
    return {
      requiredElements: 'FAIL',
      forbiddenElements: 'FAIL',
      storyAlignment: 'FAIL',
      composition: 'FAIL',
      characterConsistency: 'FAIL',
      locationConsistency: 'FAIL',
      objectConsistency: 'FAIL',
      overall: 'FAIL',
      reasoning:
        'OPENROUTER_API_KEY missing — image downloaded but visual inspection requires manual review.',
      inspected: false,
      inspectionMethod: 'manual_required',
    }
  }

  const dataUrl = await downloadImageAsDataUrl(params.imageUrl)
  const model =
    process.env.OPENROUTER_VISION_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    'google/gemini-2.5-flash-preview-05-20'

  const systemPrompt = `You are a strict storyboard QA inspector for AI-generated scene images.
Inspect the actual image pixels. Do not infer from text alone.
Return JSON only with keys:
requiredElements, forbiddenElements, storyAlignment, composition, characterConsistency, locationConsistency, objectConsistency, overall, reasoning
Each check value must be PASS or FAIL.`

  const userPrompt = `Scene ${params.sceneNumber}
Purpose: ${params.spec.purpose}
Action: ${params.spec.action}
Location: ${params.spec.location}
Characters required: ${params.spec.characters.length > 0 ? params.spec.characters.join(', ') : 'NONE'}
Objects required: ${params.spec.objects.join(', ') || 'none'}
Story requirements: ${requirements.join(', ') || 'scene-specific action'}
Forbidden in image: ${forbiddenPositive.join(', ') || 'none'}

Evaluate whether the generated image matches the screenplay and storyboard intent.`

  const res = await fetchWithTimeout(
    OPENROUTER_CHAT_COMPLETIONS_URL,
    {
      method: 'POST',
      headers: getOpenRouterHeaders(),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    },
    90_000
  )

  const body = await res.text()
  if (!res.ok) {
    return {
      requiredElements: 'FAIL',
      forbiddenElements: 'FAIL',
      storyAlignment: 'FAIL',
      composition: 'FAIL',
      characterConsistency: 'FAIL',
      locationConsistency: 'FAIL',
      objectConsistency: 'FAIL',
      overall: 'FAIL',
      reasoning: `Vision inspection failed (${res.status}): ${body.slice(0, 240)}`,
      inspected: false,
      inspectionMethod: 'manual_required',
    }
  }

  const parsedBody = JSON.parse(body) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = parsedBody.choices?.[0]?.message?.content ?? body
  const parsed = parseInspectionJson(content)

  const report: V7SceneImageInspectionReport = {
    requiredElements: normalizeCheck(parsed.requiredElements),
    forbiddenElements: normalizeCheck(parsed.forbiddenElements),
    storyAlignment: normalizeCheck(parsed.storyAlignment),
    composition: normalizeCheck(parsed.composition),
    characterConsistency: normalizeCheck(parsed.characterConsistency),
    locationConsistency: normalizeCheck(parsed.locationConsistency),
    objectConsistency: normalizeCheck(parsed.objectConsistency),
    overall: normalizeCheck(parsed.overall),
    reasoning: String(parsed.reasoning ?? 'Vision inspection completed.'),
    inspected: true,
    inspectionMethod: 'openrouter_vision',
  }

  return report
}

export function formatSceneImageInspectionReport(report: V7SceneImageInspectionReport): string {
  const lines = [
    'REQUIRED ELEMENTS',
    report.requiredElements,
    '',
    'FORBIDDEN ELEMENTS',
    report.forbiddenElements,
    '',
    'STORY ALIGNMENT',
    report.storyAlignment,
    '',
    'COMPOSITION',
    report.composition,
    '',
    'CHARACTER CONSISTENCY',
    report.characterConsistency,
    '',
    'LOCATION CONSISTENCY',
    report.locationConsistency,
    '',
    'OBJECT CONSISTENCY',
    report.objectConsistency,
    '',
    'OVERALL',
    report.overall,
    '',
    `Inspection method: ${report.inspectionMethod}`,
    report.reasoning,
  ]
  return lines.join('\n')
}
