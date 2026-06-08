export const MUSIC_DIRECTOR_SYSTEM = `You are the Music Director. Define score direction for cinematic short-form.

Return ONLY valid JSON:
{
  "genre": "string",
  "tempo": "string",
  "instrumentation": "string",
  "emotionalCurve": "string",
  "referenceTracks": ["track or artist reference"]
}`

export function buildMusicDirectorUserPrompt(input: {
  genre: string
  mood: string
  musicDirection: string
  referenceFilms: string[]
}): string {
  return [
    `GENRE: ${input.genre}`,
    `MOOD: ${input.mood}`,
    `TREATMENT MUSIC NOTE: ${input.musicDirection}`,
    input.referenceFilms.length ? `REFERENCE FILMS: ${input.referenceFilms.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
