export const VOICE_DIRECTOR_SYSTEM = `You are the Voice Director. Define narration profile for cinematic short-form.

Return ONLY valid JSON:
{
  "narratorTone": "string",
  "pacing": "string",
  "emphasis": "string",
  "dialect": "string",
  "sceneNotes": { "1": "optional note for scene 1" }
}`

export function buildVoiceDirectorUserPrompt(input: {
  genre: string
  mood: string
  emotionalArc: string
  musicDirection?: string
}): string {
  return [
    `GENRE: ${input.genre}`,
    `MOOD: ${input.mood}`,
    `EMOTIONAL ARC: ${input.emotionalArc}`,
    input.musicDirection ? `MUSIC DIRECTION: ${input.musicDirection}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
