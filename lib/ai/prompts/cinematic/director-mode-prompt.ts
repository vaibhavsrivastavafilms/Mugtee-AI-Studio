import {
  directorModeDirective,
  normalizeDirectorMode,
  type DirectorMode,
} from '@/lib/cinematic/director-modes'

/** Appended to script / scene / research prompts when a director mode is active. */
export function buildDirectorModePromptSection(mode?: DirectorMode | string | null): string {
  const normalized = normalizeDirectorMode(mode)
  return directorModeDirective(normalized)
}
