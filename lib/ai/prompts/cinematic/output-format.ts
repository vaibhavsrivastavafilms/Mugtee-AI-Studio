import { sceneVisualJsonFields } from '@/lib/ai/prompts/cinematic/visual-layer'

export function buildHookLayer(): string {
  return `
HOOK QUALITY LAYER:
- Generate 3 internal hook variations in "hookVariations" (never output all 3 as the final hook).
- Pick the strongest as "hook" — short-form native, cinematic, curiosity + emotional tension.
- Hooks must earn the first 2 seconds of retention.
- Avoid: corporate language, cliché motivation, "you won't believe", "in a world where".
- Good hooks: specific, visual, emotionally loaded, slightly unfinished.
`.trim()
}

export function buildCaptionLayer(): string {
  return `
CAPTION QUALITY LAYER:
Return captions as an object (NOT an array):
{
  "primary": "main short-form caption — emotionally engaging, creator-native",
  "cta": "short CTA line (save this / send to someone / watch twice)",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}
- Max 3 hashtags. Niche-relevant only. No spam blocks.
- No "follow for more" / "like and subscribe".
- Platform-native, retention-focused, concise.
`.trim()
}

export function buildOutputFormatLayer(sceneTarget: number, duration: number): string {
  return `
OUTPUT FORMAT (exact JSON shape):
{
  "title": "short cinematic project title",
  "hookVariations": ["variation 1", "variation 2", "variation 3"],
  "hook": "strongest hook only",
  "summary": "2-3 sentence cinematic summary",
  "script": "full voiceover-ready narration with scene breaks",
  "scenes": [
    { "id": "scene-1", "title": "beat title", "description": "see + feel", "duration": 4,
      ${sceneVisualJsonFields()} }
  ],
  "captions": {
    "primary": "...",
    "cta": "...",
    "hashtags": ["#one", "#two", "#three"]
  },
  "suggestedVoiceStyle": "warm_documentary | emotional_cinematic | deep_trailer | calm_storyteller"
}

Hard rules:
- Exactly ${sceneTarget} scenes; durations sum ≈ ${duration}s.
- suggestedVoiceStyle must match story niche + tone intentionally.
`.trim()
}
