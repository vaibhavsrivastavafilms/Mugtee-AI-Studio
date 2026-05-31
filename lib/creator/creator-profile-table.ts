import {
  normalizeCreatorMemoryProfile,
  type CreatorMemoryProfile,
} from '@/lib/creator/creator-memory'

export type CreatorProfileRow = {
  id: string
  user_id: string
  creator_name: string | null
  platform: string | null
  niche: string | null
  creator_goal: string | null
  content_style: string | null
  experience_level: string | null
  created_at: string
  updated_at: string
}

export type CreatorProfileTableInput = {
  creator_name?: string
  platform?: string
  niche?: string
  creator_goal?: string
  content_style?: string
  experience_level?: string
}

const FIELD_LIMIT = 120

function trim(value: unknown, max = FIELD_LIMIT): string | undefined {
  if (typeof value !== 'string') return undefined
  const t = value.trim()
  return t ? t.slice(0, max) : undefined
}

export function memoryProfileToTableInput(
  profile: CreatorMemoryProfile
): CreatorProfileTableInput {
  return {
    creator_name: trim(profile.creatorName, 120),
    platform: trim(profile.primaryPlatform),
    niche: trim(profile.niche),
    creator_goal: trim(profile.creatorGoal),
    content_style: trim(profile.contentStyle),
    experience_level: trim(profile.experience),
  }
}

export function tableRowToMemoryProfile(
  row: CreatorProfileRow | null | undefined
): CreatorMemoryProfile {
  if (!row) return {}
  return normalizeCreatorMemoryProfile({
    creatorName: row.creator_name ?? undefined,
    primaryPlatform: row.platform ?? undefined,
    niche: row.niche ?? undefined,
    creatorGoal: row.creator_goal ?? undefined,
    contentStyle: row.content_style ?? undefined,
    experience: row.experience_level ?? undefined,
    updatedAt: row.updated_at,
  })
}

export function mergeTableInput(
  existing: CreatorProfileRow | null | undefined,
  patch: CreatorProfileTableInput
): CreatorProfileTableInput {
  const current = existing
    ? memoryProfileToTableInput(tableRowToMemoryProfile(existing))
    : {}
  return {
    creator_name: patch.creator_name ?? current.creator_name,
    platform: patch.platform ?? current.platform,
    niche: patch.niche ?? current.niche,
    creator_goal: patch.creator_goal ?? current.creator_goal,
    content_style: patch.content_style ?? current.content_style,
    experience_level: patch.experience_level ?? current.experience_level,
  }
}

export function parseCreatorProfileTableInput(
  raw: Record<string, unknown>
): CreatorProfileTableInput {
  const pick = (snake: keyof CreatorProfileTableInput, camel: string) =>
    trim(raw[snake] ?? raw[camel])

  return {
    creator_name: pick('creator_name', 'creatorName'),
    platform: pick('platform', 'primaryPlatform'),
    niche: pick('niche', 'niche'),
    creator_goal: pick('creator_goal', 'creatorGoal'),
    content_style: pick('content_style', 'contentStyle'),
    experience_level: pick('experience_level', 'experience'),
  }
}

export function hasCreatorProfileTableRow(
  row: CreatorProfileRow | null | undefined
): boolean {
  return Boolean(row?.id)
}

export function isCreatorProfileOnboardingComplete(
  input: CreatorProfileTableInput
): boolean {
  return Boolean(
    input.creator_name &&
      input.platform &&
      input.niche &&
      input.creator_goal &&
      input.content_style &&
      input.experience_level
  )
}
