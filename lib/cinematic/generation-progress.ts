export const CINEMATIC_GENERATION_LINES = [
  'Structuring emotional pacing…',
  'Designing cinematic scene flow…',
  'Refining hook tension…',
  'Framing storyboard beats…',
  'Shaping caption rhythm…',
  'Directing scene-by-scene visuals…',
] as const

export function pickGenerationLine(index: number): string {
  return CINEMATIC_GENERATION_LINES[index % CINEMATIC_GENERATION_LINES.length]
}
