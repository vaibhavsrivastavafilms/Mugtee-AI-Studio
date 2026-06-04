import type { DirectorTreatment, StoryDirectionOption } from '@/lib/director/types'
import { EMPTY_DIRECTOR_TREATMENT } from '@/lib/director/types'

/** Derive an editable director treatment from story direction + topic. */
export function buildDirectorTreatmentFromDirection(
  topic: string,
  direction: StoryDirectionOption | null
): DirectorTreatment {
  const base = { ...EMPTY_DIRECTOR_TREATMENT }
  if (!direction) {
    return {
      ...base,
      genre: 'Documentary short',
      mood: topic.trim() ? 'Focused, cinematic' : 'Neutral',
      visualStyle: 'Cinematic realism',
    }
  }

  const angleLabel = direction.title.split(':')[0]?.trim() || 'Cinematic'
  return {
    genre: angleLabel,
    mood: direction.emotionalPromise.slice(0, 120),
    emotionalArc: `Setup → tension → ${direction.hook.slice(0, 80)}`,
    visualStyle: `${angleLabel} — controlled contrast, motivated camera`,
    cameraLanguage: 'Motivated singles and inserts; avoid unmotivated whip pans',
    lightingStyle: 'Practical-motivated key with soft fill',
    colorPalette: 'Deep neutrals with gold accent highlights',
    musicDirection: direction.emotionalPromise.slice(0, 100),
    referenceFilms: [],
  }
}

export function normalizeDirectorTreatment(raw: unknown): DirectorTreatment {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...EMPTY_DIRECTOR_TREATMENT }
  }
  const o = raw as Record<string, unknown>
  const str = (k: keyof DirectorTreatment) =>
    typeof o[k] === 'string' ? (o[k] as string) : ''
  const films = Array.isArray(o.referenceFilms)
    ? o.referenceFilms.filter((f): f is string => typeof f === 'string').slice(0, 8)
    : []
  return {
    genre: str('genre'),
    mood: str('mood'),
    emotionalArc: str('emotionalArc'),
    visualStyle: str('visualStyle'),
    cameraLanguage: str('cameraLanguage'),
    lightingStyle: str('lightingStyle'),
    colorPalette: str('colorPalette'),
    musicDirection: str('musicDirection'),
    referenceFilms: films,
  }
}
