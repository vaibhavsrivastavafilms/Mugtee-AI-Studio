/**
 * Script archetypes — backward-compatible facade over narrative-structure-engine.
 * Selection, prompts, and metadata use the 15 narrative content archetypes.
 */
import type { CinematicNiche } from '@/lib/cinematic/niches'
import {
  getContentAngle,
  normalizeContentAngleId,
  type ContentAngleId,
} from '@/lib/cinematic/content-angle-engine'
import {
  NARRATIVE_ARCHETYPE_IDS,
  NARRATIVE_ARCHETYPES,
  buildNarrativeFlowDisplay,
  buildNarrativeStructurePromptSection,
  buildBannedScriptPhrasesSection,
  normalizeNarrativeArchetypeId,
  narrativeMetaFromSelection,
  parseNarrativeMetaFromOutput,
  resolveNarrativeFromOutput,
  selectNarrativeArchetype,
  type NarrativeArchetypeId,
  type NarrativeStructureMeta,
  type SelectedNarrativeArchetype,
} from '@/lib/cinematic/narrative-structure-engine'

export const SCRIPT_ARCHETYPE_IDS = NARRATIVE_ARCHETYPE_IDS
export type ScriptArchetypeId = NarrativeArchetypeId

export type ScriptArchetype = SelectedNarrativeArchetype

export const SCRIPT_ARCHETYPES = NARRATIVE_ARCHETYPES

export type SelectedScriptArchetype = SelectedNarrativeArchetype & {
  archetypeDisplay?: string
}

export type SelectScriptArchetypeInput = {
  niche?: CinematicNiche | string
  topic?: string
  contentType?: string
  sessionSeed?: string | number
  creatorNiche?: string
  contentAngleId?: ContentAngleId | string
}

export function getScriptArchetype(id: ScriptArchetypeId): ScriptArchetype {
  return NARRATIVE_ARCHETYPES[id]
}

export function selectScriptArchetype(
  input: SelectScriptArchetypeInput
): SelectedScriptArchetype {
  const archetype = selectNarrativeArchetype(input)
  const angleId = normalizeContentAngleId(input.contentAngleId)
  const anglePrefs = angleId ? getContentAngle(angleId).narrativeArchetypePrefs : []
  const secondary =
    anglePrefs.length > 1 && anglePrefs[1] !== archetype.id
      ? NARRATIVE_ARCHETYPES[anglePrefs[1]]
      : null
  const seed = Math.abs(
    (input.topic ?? '').length ^
      String(input.sessionSeed ?? '').length ^
      (input.niche ?? '').length
  )
  const archetypeDisplay =
    secondary && seed % 4 === 0 ? `${archetype.label} · ${secondary.label}` : undefined

  return { ...archetype, archetypeDisplay }
}

export function buildArchetypePromptSection(archetype: SelectedScriptArchetype): string {
  return buildNarrativeStructurePromptSection(archetype)
}

export { buildBannedScriptPhrasesSection, buildNarrativeFlowDisplay }

export function resolveArchetypeFromOutput(
  raw: Record<string, unknown>,
  fallback: SelectedScriptArchetype
): SelectedScriptArchetype {
  const resolved = resolveNarrativeFromOutput(raw, fallback)
  const archetypeDisplay =
    typeof raw.archetypeDisplay === 'string' && raw.archetypeDisplay.trim()
      ? raw.archetypeDisplay.trim()
      : fallback.archetypeDisplay
  return { ...resolved, archetypeDisplay }
}

export type ScriptArchetypeMeta = NarrativeStructureMeta & {
  /** @deprecated Use narrativeArchetype */
  archetypeId?: ScriptArchetypeId
  /** @deprecated Use narrativeArchetypeLabel */
  archetypeLabel?: string
  archetypeDisplay?: string
}

export function archetypeMetaFromSelection(
  archetype: SelectedScriptArchetype
): ScriptArchetypeMeta {
  const narrative = narrativeMetaFromSelection(archetype)
  return {
    ...narrative,
    archetypeId: narrative.narrativeArchetype,
    archetypeLabel: narrative.narrativeArchetypeLabel,
    ...(archetype.archetypeDisplay ? { archetypeDisplay: archetype.archetypeDisplay } : {}),
  }
}

export function narrativeMetaFromArchetypeSelection(
  archetype: SelectedScriptArchetype
): NarrativeStructureMeta {
  return narrativeMetaFromSelection(archetype)
}

export function parseNarrativeMetaFromArchetypeOutput(
  raw: Record<string, unknown>,
  fallback: SelectedScriptArchetype
): NarrativeStructureMeta {
  return parseNarrativeMetaFromOutput(raw, fallback)
}

export function scriptArchetypeDisplayLabel(meta?: ScriptArchetypeMeta | null): string | null {
  if (!meta?.narrativeArchetypeLabel?.trim() && !meta?.archetypeLabel?.trim()) return null
  return (
    meta.archetypeDisplay?.trim() ||
    meta.narrativeArchetypeLabel?.trim() ||
    meta.archetypeLabel?.trim() ||
    null
  )
}

export function normalizeArchetypeId(raw: unknown): ScriptArchetypeId | null {
  return normalizeNarrativeArchetypeId(raw)
}

export type { NarrativeStructureMeta, NarrativeArchetypeId }
