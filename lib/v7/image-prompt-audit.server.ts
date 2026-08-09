import 'server-only'

import type { V7CharacterBible } from '@/agents/v7/character-director.server'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'
import type { V7WorldBible } from '@/agents/v7/world-builder.server'
import {
  buildV7ScenePromptBundles,
  validateV7SceneImagePrompt,
} from '@/lib/v7/image-prompt.server'
import { V7_IMAGE_PROMPT_MIN_SCORE, characterMatchesSceneName } from '@/lib/v7/image-prompt-spec.core'
import { loadV7StageBibles } from '@/lib/v7/scene-package.server'
import type { V7CreativeBrief, V7ProductionSnapshot } from '@/types/v7/production'

export type V7ImagePromptPreviewRow = Omit<V7ImagePromptAuditRow, 'objects'> & {
  purpose: string
  subject: string
  actionText: string
  sceneLocation: string
  objectList: string[]
  composition: string
  camera: string
  lighting: string
  required: {
    subject: string
    action: string
    objects: string
    location: string
  }
  forbidden: {
    characters: string[]
    locations: string[]
    objects: string[]
    concepts: string[]
  }
  pollinationsRequest: {
    provider: string
    method: string
    width: number
    height: number
    seed: number
    combinedPrompt: string
  }
}

export type V7ImagePromptPreviewResult = {
  productionId: string
  title: string
  sceneCount: number
  rows: V7ImagePromptPreviewRow[]
  allPassed: boolean
}

export type V7ImagePromptAuditRow = {
  sceneNumber: number
  characters: string
  action: 'PASS' | 'FAIL'
  location: 'PASS' | 'FAIL'
  objects: 'PASS' | 'FAIL'
  negativeConstraints: 'PASS' | 'FAIL'
  score: number
  status: 'PASS' | 'FAIL'
  expected: string
  prompt: string
  negativePrompt: string
  missingRequirements: string[]
  forbiddenTermsFound: string[]
}

export type V7ImagePromptAuditResult = {
  productionId: string
  title: string
  sceneCount: number
  rows: V7ImagePromptAuditRow[]
  allPassed: boolean
}

function stageOutput<T>(snapshot: V7ProductionSnapshot, stage: string, key: string): T | null {
  const row = snapshot.stages.find((entry) => entry.stage === stage)
  const output = row?.output as Record<string, unknown> | null
  return (output?.[key] as T | undefined) ?? null
}

export function auditV7ImagePromptsForSnapshot(
  snapshot: V7ProductionSnapshot
): V7ImagePromptAuditResult {
  const brief = snapshot.production.creative_brief
  if (!brief) {
    throw new Error('Production creative brief missing')
  }

  const script = stageOutput<V7ScriptDocument>(snapshot, 'script', 'script')
  const storyboard = stageOutput<V7StoryboardDocument>(snapshot, 'storyboard', 'storyboard')
  if (!script || !storyboard) {
    throw new Error('Production screenplay or storyboard missing')
  }

  const bibles = loadV7StageBibles(snapshot)
  const direction = bibles.direction
  if (!direction) {
    throw new Error('Production creative direction missing')
  }

  const bundles = buildV7ScenePromptBundles({
    brief,
    direction,
    script,
    storyboard,
    scenes: snapshot.scenes.map((scene) => ({ id: scene.id, number: scene.number })),
    productionId: snapshot.production.id,
    characterBible: bibles.characterBible,
    worldBible: bibles.worldBible,
  })

  const rows = bundles.map((bundle) => {
    const validation = validateV7SceneImagePrompt({
      spec: bundle.spec,
      prompt: bundle.prompt,
      negativePrompt: bundle.negativePrompt,
      characterBible: bibles.characterBible,
    })

    return {
      sceneNumber: bundle.sceneNumber,
      characters: bundle.spec.characters.length > 0 ? bundle.spec.characters.join(', ') : 'NONE',
      action: (validation.score.actionRelevance >= 70 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      location: (validation.score.locationRelevance >= 70 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      objects: (validation.score.objectRelevance >= 70 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      negativeConstraints:
        (validation.forbiddenTermsFound.length === 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      score: validation.score.overall,
      status: (validation.valid ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      expected: summarizeExpected(bundle.spec.purpose, bundle.spec.action),
      prompt: bundle.prompt,
      negativePrompt: bundle.negativePrompt,
      missingRequirements: validation.missingRequirements,
      forbiddenTermsFound: validation.forbiddenTermsFound,
    }
  })

  return {
    productionId: snapshot.production.id,
    title: snapshot.production.title,
    sceneCount: rows.length,
    rows,
    allPassed: rows.every((row) => row.status === 'PASS'),
  }
}

function extractActionTerms(spec: { action: string }): string[] {
  return spec.action
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function summarizeExpected(purpose: string, action: string): string {
  return `${purpose}: ${action}`
}

function deriveForbiddenPreviewBreakdown(params: {
  spec: import('@/lib/v7/image-prompt-spec.core').V7SceneImageSpec
  characterBible?: V7CharacterBible | null
}): V7ImagePromptPreviewRow['forbidden'] {
  const { spec, characterBible } = params
  const characters = new Set<string>()
  const locations = new Set<string>()
  const objects = new Set<string>()
  const concepts = new Set<string>(spec.forbiddenElements)

  if (spec.characters.length === 0) {
    for (const entry of characterBible?.characters ?? []) {
      characters.add(entry.name)
    }
    characters.add('people')
    characters.add('chef portrait')
    characters.add('couple')
  } else {
    for (const entry of characterBible?.characters ?? []) {
      const allowed = spec.characters.some((name) => characterMatchesSceneName(name, entry))
      if (!allowed) characters.add(entry.name)
    }
  }

  if (spec.isGraphicScene) {
    locations.add('kitchen')
    locations.add('restaurant interior')
    locations.add('food photography')
    objects.add('cast iron pan')
    objects.add('steak')
    objects.add('kitchen utensils')
  }

  if (spec.isMacroFoodScene) {
    locations.add('dining room portrait')
  }

  if (/dining\s*room|restaurant/i.test(spec.location) && spec.characters.length === 0) {
    locations.add('kitchen')
    characters.add('chef portrait')
  }

  if (spec.characters.some((name) => /couple|diner|elegant/i.test(name))) {
    locations.add('kitchen')
    locations.add('plating station')
    characters.add('chef portrait')
  }

  for (const term of spec.forbiddenElements) {
    if (/kitchen|dining|restaurant|plating/i.test(term)) {
      locations.add(term)
      concepts.delete(term)
    }
  }

  return {
    characters: [...characters],
    locations: [...locations],
    objects: [...objects],
    concepts: [...concepts],
  }
}

export function previewV7ImagePromptsForSnapshot(
  snapshot: V7ProductionSnapshot
): V7ImagePromptPreviewResult {
  const audit = auditV7ImagePromptsForSnapshot(snapshot)
  const brief = snapshot.production.creative_brief
  if (!brief) throw new Error('Production creative brief missing')

  const script = stageOutput<V7ScriptDocument>(snapshot, 'script', 'script')
  const storyboard = stageOutput<V7StoryboardDocument>(snapshot, 'storyboard', 'storyboard')
  if (!script || !storyboard) throw new Error('Production screenplay or storyboard missing')

  const bibles = loadV7StageBibles(snapshot)
  const direction = bibles.direction
  if (!direction) throw new Error('Production creative direction missing')

  const bundles = buildV7ScenePromptBundles({
    brief,
    direction,
    script,
    storyboard,
    scenes: snapshot.scenes.map((scene) => ({ id: scene.id, number: scene.number })),
    productionId: snapshot.production.id,
    characterBible: bibles.characterBible,
    worldBible: bibles.worldBible,
  })

  const rows: V7ImagePromptPreviewRow[] = bundles.map((bundle) => {
    const auditRow = audit.rows.find((row) => row.sceneNumber === bundle.sceneNumber)
    if (!auditRow) throw new Error(`Audit row missing for scene ${bundle.sceneNumber}`)

    const avoid = bundle.negativePrompt.trim()
    const combinedPrompt = avoid ? `${bundle.prompt}\n\nAvoid: ${avoid}` : bundle.prompt

    return {
      ...auditRow,
      purpose: bundle.spec.purpose,
      subject: bundle.spec.subject,
      actionText: bundle.spec.action,
      sceneLocation: bundle.spec.location,
      objectList: bundle.spec.objects,
      composition: bundle.spec.composition || '—',
      camera: bundle.spec.camera,
      lighting: bundle.spec.lighting,
      required: {
        subject: bundle.spec.subject,
        action: bundle.spec.action,
        objects: bundle.spec.objects.join(', ') || '—',
        location: bundle.spec.location,
      },
      forbidden: deriveForbiddenPreviewBreakdown({
        spec: bundle.spec,
        characterBible: bibles.characterBible,
      }),
      pollinationsRequest: {
        provider: 'Pollinations',
        method: 'GET /image/{prompt}',
        width: bundle.width,
        height: bundle.height,
        seed: bundle.seed,
        combinedPrompt,
      },
    }
  })

  return {
    productionId: audit.productionId,
    title: audit.title,
    sceneCount: audit.sceneCount,
    rows,
    allPassed: audit.allPassed,
  }
}

function formatList(label: string, items: string[]): string[] {
  if (items.length === 0) return [`- ${label}: —`]
  return [`- ${label}:`, ...items.map((item) => `  - ${item}`)]
}

export function formatV7ImagePreviewReport(result: V7ImagePromptPreviewResult): string {
  const lines: string[] = []
  lines.push('# IMAGE PREVIEW')
  lines.push('')
  lines.push(`Production: ${result.title} (${result.productionId})`)
  lines.push(`Scenes: ${result.sceneCount}`)
  lines.push(`Prompts: ${result.rows.length}/${result.sceneCount}`)
  lines.push(`Validation: ${result.allPassed ? 'PASS' : 'FAIL'}`)
  lines.push('')

  for (const row of result.rows) {
    lines.push(`SCENE ${row.sceneNumber}`)
    lines.push('')
    lines.push(`Purpose:`)
    lines.push(row.purpose)
    lines.push(`Subject:`)
    lines.push(row.subject)
    lines.push(`Action:`)
    lines.push(row.actionText)
    lines.push(`Location:`)
    lines.push(row.sceneLocation)
    lines.push(`Characters:`)
    lines.push(row.characters)
    lines.push(`Objects:`)
    lines.push(row.objectList.length > 0 ? row.objectList.join(', ') : '—')
    lines.push(`Composition:`)
    lines.push(row.composition)
    lines.push(`Camera:`)
    lines.push(row.camera)
    lines.push(`Lighting:`)
    lines.push(row.lighting)
    lines.push('')
    lines.push('Required:')
    lines.push(`- required subject: ${row.required.subject}`)
    lines.push(`- required action: ${row.required.action}`)
    lines.push(`- required objects: ${row.required.objects}`)
    lines.push(`- required location: ${row.required.location}`)
    lines.push('')
    lines.push('Forbidden:')
    lines.push(...formatList('forbidden characters', row.forbidden.characters))
    lines.push(...formatList('forbidden locations', row.forbidden.locations))
    lines.push(...formatList('forbidden objects', row.forbidden.objects))
    lines.push(...formatList('forbidden concepts', row.forbidden.concepts))
    lines.push('')
    lines.push(row.status)
    lines.push('')
    lines.push('FINAL IMAGE PROMPT:')
    lines.push(row.prompt)
    lines.push('')
    lines.push('NEGATIVE PROMPT:')
    lines.push(row.negativePrompt)
    lines.push('')
    lines.push('PROMPT SCORE:')
    lines.push(`${row.score}/100`)
    lines.push('')
    lines.push('POLLINATIONS REQUEST:')
    lines.push('')
    lines.push(`Provider: ${row.pollinationsRequest.provider}`)
    lines.push(`Method: ${row.pollinationsRequest.method}`)
    lines.push(`Width: ${row.pollinationsRequest.width}`)
    lines.push(`Height: ${row.pollinationsRequest.height}`)
    lines.push(`Seed: ${row.pollinationsRequest.seed}`)
    lines.push('')
    lines.push('Combined prompt (would be sent):')
    lines.push(row.pollinationsRequest.combinedPrompt)
    lines.push('')
    lines.push('Generation: NOT EXECUTED')
    lines.push('Pollen spent: 0')
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  lines.push('IMAGE PREVIEW')
  lines.push('')
  lines.push(`Scenes: ${result.sceneCount}`)
  lines.push(`Prompts: ${result.rows.length}/${result.sceneCount}`)
  lines.push(`Validation: ${result.allPassed ? 'PASS' : 'FAIL'}`)
  lines.push('Generation executed: NO')
  lines.push('Pollen spent: 0')
  lines.push('')
  lines.push('Do NOT proceed to image generation until manually approved.')

  return lines.join('\n')
}

export function formatV7ImagePromptAuditReport(result: V7ImagePromptAuditResult): string {
  const lines: string[] = []
  lines.push('# IMAGE PROMPT AUDIT')
  lines.push('')
  lines.push(`Production: ${result.title} (${result.productionId})`)
  lines.push(`Scenes: ${result.sceneCount}`)
  lines.push(`Minimum score: ${V7_IMAGE_PROMPT_MIN_SCORE}/100`)
  lines.push('')
  lines.push(
    '| Scene | Characters | Action | Location | Objects | Negative Constraints | Score | Status |'
  )
  lines.push('|------:|------------|--------|----------|---------|----------------------|------:|--------|')

  for (const row of result.rows) {
    lines.push(
      `| ${row.sceneNumber} | ${row.characters} | ${row.action} | ${row.location} | ${row.objects} | ${row.negativeConstraints} | ${row.score} | ${row.status} |`
    )
  }

  lines.push('')
  for (const row of result.rows) {
    lines.push(`SCENE ${row.sceneNumber}`)
    lines.push('')
    lines.push(`Expected:`)
    lines.push(row.expected)
    lines.push('')
    lines.push('Prompt:')
    lines.push(row.prompt)
    lines.push('')
    lines.push('Negative:')
    lines.push(row.negativePrompt)
    lines.push('')
    lines.push(`Score:`)
    lines.push(`${row.score}/100`)
    lines.push('')
    lines.push('Generation:')
    lines.push('NOT EXECUTED')
    if (row.missingRequirements.length > 0) {
      lines.push(`Missing: ${row.missingRequirements.join(', ')}`)
    }
    if (row.forbiddenTermsFound.length > 0) {
      lines.push(`Forbidden in prompt: ${row.forbiddenTermsFound.join(', ')}`)
    }
    lines.push('')
  }

  lines.push('POLLINATIONS GENERATION EXECUTED:')
  lines.push('NO')
  lines.push('')
  lines.push('POLLEN SPENT:')
  lines.push('0')
  lines.push('')
  lines.push('ANIMATION EXECUTED:')
  lines.push('NO')
  lines.push('')
  lines.push(`READY FOR IMAGE GENERATION: ${result.allPassed ? 'YES' : 'NO'}`)

  return lines.join('\n')
}

export type {
  V7CharacterBible,
  V7CreativeBrief,
  V7CreativeDirection,
  V7ScriptDocument,
  V7StoryboardDocument,
  V7WorldBible,
}
