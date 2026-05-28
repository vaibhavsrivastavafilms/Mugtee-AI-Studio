import { buildNicheLayer } from '@/lib/cinematic/niches'
import { sceneVisualJsonFields } from '@/lib/ai/prompts/cinematic/visual-layer'
import { pacingPromptFragment } from '@/lib/virlo-engine/pacing-engine'
import { visualLanguagePromptFragment } from '@/lib/virlo-engine/visual-language'
import type { VirloContext } from '@/lib/virlo-engine/types'

export function buildVirloScriptPrompt(ctx: VirloContext): string {
  const { topicAnalysis, structure, retention, selectedHook, hooks } = ctx

  return [
    `VIRLO ENGINE — unique story blueprint (do NOT use generic templates):`,
    `Creator brief:
- Idea: "${ctx.idea}"
- Platform: ${ctx.platform} (vertical 9:16)
- Tone: ${ctx.tone}
- Locked niche: ${topicAnalysis.niche}
- Platform behavior: ${topicAnalysis.platformBehavior}`,
    buildStructureLayer(structure),
    buildEmotionLayer(ctx),
    buildRetentionLayer(retention),
    pacingPromptFragment(ctx.pacing),
    buildCreativeSeedLayer(ctx),
    buildHookDirectiveLayer(selectedHook, hooks),
    buildNicheLayer(topicAnalysis.niche),
    buildVisualDirectiveLayer(ctx),
    buildCaptionLayer(),
    buildOutputFormatLayer(ctx.sceneTarget, ctx.duration),
  ].join('\n\n')
}

export function buildVirloTitlePrompt(ctx: VirloContext): string {
  return [
    `Generate a viral short-form title and hook for this idea using VIRLO structure "${ctx.structure.name}".`,
    `Idea: "${ctx.idea}"`,
    `Niche: ${ctx.topicAnalysis.niche}`,
    `Emotional goal: ${ctx.emotionalGoal}`,
    `Preferred hook pattern: ${ctx.selectedHook.pattern}`,
    `Hook tension reference (adapt, do not copy verbatim): ${ctx.selectedHook.text}`,
    `Opening move: ${ctx.structure.openingMove}`,
    `Avoid generic patterns: "you won't believe", "ultimate guide", "in a world where".`,
    `Return JSON: { "title": string, "hook": string, "hookVariations": string[3] }`,
  ].join('\n')
}

export function buildVirloScenesPrompt(ctx: VirloContext, script: string): string {
  return [
    `Break this script into ${ctx.sceneTarget} vertical 9:16 cinematic scenes.`,
    `VIRLO structure: ${ctx.structure.name} (Format ${ctx.structure.formatNumber})`,
    `Retention: ${ctx.retention.type} — payoff near ${ctx.retention.payoffTimingSec}s`,
    visualLanguagePromptFragment(ctx.visuals),
    `Use EXACT visual directions above per scene index — do not repeat camera/lighting across scenes.`,
    `Script:\n${script.slice(0, 8000)}`,
    `Return JSON { "scenes": [{ id, title, description, duration, ${sceneVisualJsonFields()} }] }`,
  ].join('\n\n')
}

function buildStructureLayer(
  structure: VirloContext['structure']
): string {
  return [
    `STORY STRUCTURE — ${structure.name} (Format ${structure.formatNumber}):`,
    ...structure.pattern.map((step, i) => `${i + 1}. ${step}`),
    `Opening move: ${structure.openingMove}`,
    `Midpoint turn: ${structure.midpointTurn}`,
    `Closing move: ${structure.closingMove}`,
  ].join('\n')
}

function buildEmotionLayer(ctx: VirloContext): string {
  return [
    `EMOTIONAL GOAL: ${ctx.emotionalGoal}`,
    ...ctx.emotionalNotes.map((n) => `- ${n}`),
    `Emotional arc: ${ctx.creativeSeed.emotionalArc}`,
  ].join('\n')
}

function buildRetentionLayer(retention: VirloContext['retention']): string {
  return [
    `RETENTION PLAN (${retention.type}):`,
    `Curiosity gaps: ${retention.curiosityGaps.join(' | ')}`,
    `Open loops: ${retention.openLoops.join(' | ')}`,
    `Escalation: ${retention.escalationSteps.join(' → ')}`,
    `Payoff timing: ~${retention.payoffTimingSec}s`,
    ...retention.beats.map(
      (b) => `- ${b.phase} @${b.secondsFromStart}s: ${b.instruction}`
    ),
  ].join('\n')
}

function buildCreativeSeedLayer(ctx: VirloContext): string {
  return [
    `CREATIVE SEED (variation fingerprint — honor but do not mention in output):`,
    `- Narrative rhythm: ${ctx.creativeSeed.narrativeRhythm}`,
    `- Narration intensity: ${ctx.creativeSeed.narrationIntensity}`,
    `- Visual style: ${ctx.creativeSeed.visualStyle}`,
    `- Seed: ${ctx.creativeSeed.seed}`,
    `Memory avoidance: do not reuse recent structures/hooks from prior runs.`,
  ].join('\n')
}

function buildHookDirectiveLayer(
  selected: VirloContext['selectedHook'],
  candidates: VirloContext['hooks']
): string {
  return [
    `HOOK ENGINE:`,
    `- Selected pattern: ${selected.pattern} (${selected.variant}, tension ${selected.tensionScore.toFixed(1)})`,
    `- Reference hook (adapt — do not copy verbatim): ${selected.text}`,
    `- Generate 3 variations in hookVariations; strongest becomes "hook".`,
    `- Alternate patterns considered: ${candidates
      .slice(1, 4)
      .map((c) => c.pattern)
      .join(', ')}`,
    `- Avoid weak openings and niche "avoid" vocabulary.`,
  ].join('\n')
}

function buildVisualDirectiveLayer(ctx: VirloContext): string {
  return [
    `VISUAL LANGUAGE (unique per scene — mandatory):`,
    visualLanguagePromptFragment(ctx.visuals),
    `Each scene MUST use its assigned camera, lighting, movement — no duplicate combos.`,
  ].join('\n')
}

function buildCaptionLayer(): string {
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
`.trim()
}

function buildOutputFormatLayer(sceneTarget: number, duration: number): string {
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
- Every output must feel unique to this topic — no template filler.
`.trim()
}

export function buildVirloSystemPrompt(): string {
  return `You are Mugtee — cinematic AI studio powered by the VIRLO engine.
You think like a film director, reel editor, and retention strategist combined.

Rules:
- Output strict JSON only. No markdown. No extra keys.
- Follow the VIRLO structure, retention beats, and per-scene visual language exactly.
- Never reuse generic AI phrasing, motivational clichés, or template story shapes.
- Every line must feel filmable, human, and niche-native.`.trim()
}
