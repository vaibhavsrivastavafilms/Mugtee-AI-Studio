import {
  creatorBlueprintDirective,
  normalizeCreatorBlueprintId,
} from '@/lib/cinematic/creator-blueprints'

/** Appended to script prompts when a creator blueprint is active. */
export function buildCreatorBlueprintPromptSection(
  blueprintId?: string | null
): string {
  const id = normalizeCreatorBlueprintId(blueprintId)
  if (!id) return ''
  return creatorBlueprintDirective(id)
}
