export function buildPacingLayer(duration: number): string {
  const sceneTarget = duration <= 30 ? 4 : duration <= 60 ? 6 : 8

  return `
CINEMATIC PACING LAYER (vertical short-form):
- Target runtime: ${duration}s across exactly ${sceneTarget} scenes.
- Scene 1: pattern interrupt / emotional hook (fastest cut energy).
- Middle scenes: escalate emotional intensity — never flat repetition.
- Penultimate scene: deepest feeling or sharpest insight.
- Final scene: landing beat — silence, choice, or aftertaste (not a lecture).
- Vary scene function: observation → tension → reveal → consequence → hold.
- Each scene description must specify what we SEE + what we FEEL (vertical 9:16).
- Each scene must include full visual direction (camera, lighting, palette, movement, environment).
- Scene durations: integers 2-8s; total must land near ${duration}s.
- Avoid duplicate framing ("person staring", "close-up face") across scenes.
`.trim()
}
