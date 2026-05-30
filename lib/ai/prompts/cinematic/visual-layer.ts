export function buildVisualLayer(): string {
  return `
VISUAL DIRECTION LAYER (filmmaker language — NOT image-gen keyword spam):
Every scene MUST include visual direction fields. Think like a DP + director on a vertical set.

For each scene return:
- imagePrompt: scene-only still description (characters, objects, environment, actions, visual focus) — Storyboard SOP rules; NO art style, medium, rendering, or lighting adjectives
- visualPrompt: director notes (composition, atmosphere, emotional read) — may reference camera/environment
- cameraAngle: framing + lens feel (e.g. "Intimate close-up, 50mm feel")
- lightingMood: emotional lighting (e.g. "Soft window light, gentle falloff")
- environment: where we are — specific, filmable
- colorPalette: color story (e.g. "Blue-black noir, neon rim")
- movementStyle: camera movement (e.g. "Slow drifting tracking shot")

Rules:
- Vertical 9:16 composition always
- Style is applied via locked visualStyle + reference images — never inside imagePrompt
- Visual-first, emotionally immersive, creator-native film vocabulary
- Match emotional pacing to visual pacing (fast beats = sharper motion; landing beats = stillness)
- NO Midjourney dumps, NO "masterpiece/8k/artstation", NO fantasy over-stylization
- Mugtee is a film director assistant, not an AI art tool
`.trim()
}

export function sceneVisualJsonFields(): string {
  return `"imagePrompt": "single-frame still for image gen",
      "visualPrompt": "cinematic direction paragraph",
      "cameraAngle": "framing + lens feel",
      "lightingMood": "emotional lighting",
      "environment": "filmable location",
      "colorPalette": "color story",
      "movementStyle": "camera movement"`
}
