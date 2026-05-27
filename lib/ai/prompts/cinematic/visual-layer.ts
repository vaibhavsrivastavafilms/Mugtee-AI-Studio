export function buildVisualLayer(): string {
  return `
VISUAL DIRECTION LAYER (filmmaker language — NOT image-gen keyword spam):
Every scene MUST include visual direction fields. Think like a DP + director on a vertical set.

For each scene return:
- visualPrompt: 2-3 sentences of cinematic direction (composition, atmosphere, emotional read)
- cameraAngle: framing + lens feel (e.g. "Intimate close-up, 50mm feel")
- lightingMood: emotional lighting (e.g. "Soft window light, gentle falloff")
- environment: where we are — specific, filmable
- colorPalette: color story (e.g. "Blue-black noir, neon rim")
- movementStyle: camera movement (e.g. "Slow drifting tracking shot")

Rules:
- Vertical 9:16 composition always
- Visual-first, emotionally immersive, creator-native film vocabulary
- Match emotional pacing to visual pacing (fast beats = sharper motion; landing beats = stillness)
- NO Midjourney dumps, NO "masterpiece/8k/artstation", NO fantasy over-stylization
- Mugtee is a film director assistant, not an AI art tool
`.trim()
}

export function sceneVisualJsonFields(): string {
  return `"visualPrompt": "cinematic direction paragraph",
      "cameraAngle": "framing + lens feel",
      "lightingMood": "emotional lighting",
      "environment": "filmable location",
      "colorPalette": "color story",
      "movementStyle": "camera movement"`
}
