import { buildNicheLayer } from '@/lib/cinematic/niches'
import { sceneVisualJsonFields } from '@/lib/ai/prompts/cinematic/visual-layer'
import {
  CREATOR_RETENTION_SCENE_COUNT,
  RETENTION_SCENE_BEATS,
  viralStructurePromptFragment,
  type ViralStructureAnalysis,
} from '@/lib/cinematic/viral-structure'
import { pacingPromptFragment } from '@/lib/virlo-engine/pacing-engine'
import { visualLanguagePromptFragment } from '@/lib/virlo-engine/visual-language'
import type { VirloContext } from '@/lib/virlo-engine/types'

export function buildVirloScriptPrompt(
  ctx: VirloContext,
  viralStructure?: ViralStructureAnalysis
): string {
  const { topicAnalysis, structure, retention, selectedHook, hooks } = ctx

  return [
    `VIRLO ENGINE — creator-native retention script (NOT quote mode, NOT cinematic philosophy):`,
    `Creator brief:
- Idea: "${ctx.idea}"
- Platform: ${ctx.platform} (vertical 9:16)
- Tone: ${ctx.tone}
- Locked niche: ${topicAnalysis.niche}
- Platform behavior: ${topicAnalysis.platformBehavior}`,
    viralStructure
      ? viralStructurePromptFragment(viralStructure)
      : buildCreatorStructureLayer(),
    buildEmotionLayer(ctx),
    buildRetentionLayer(retention),
    pacingPromptFragment(ctx.pacing),
    buildCreativeSeedLayer(ctx),
    buildHookDirectiveLayer(selectedHook, hooks, viralStructure),
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

export function buildVirloScenesPrompt(
  ctx: VirloContext,
  script: string,
  viralStructure?: ViralStructureAnalysis
): string {
  const sceneMap = RETENTION_SCENE_BEATS.map(
    (b) => `Scene ${b.sceneIndex} = ${b.label} (${b.instruction})`
  ).join('\n')

  return [
    `Break this script into exactly ${CREATOR_RETENTION_SCENE_COUNT} vertical 9:16 creator scenes.`,
    `RETENTION SCENE MAP (mandatory titles):`,
    sceneMap,
    viralStructure
      ? `Narration anchor per scene: ${RETENTION_SCENE_BEATS.map((b) => `${b.label}="${viralStructure[b.analysisKey].slice(0, 100)}"`).join(' · ')}`
      : '',
    `Retention: ${ctx.retention.type} — payoff near ${ctx.retention.payoffTimingSec}s`,
    visualLanguagePromptFragment(ctx.visuals),
    `Use EXACT visual directions above per scene index — do not repeat camera/lighting across scenes.`,
    `Each scene description = spoken narration (creator voice). visualPrompt = what we SEE.`,
    `Script:\n${script.slice(0, 8000)}`,
    `Return JSON { "scenes": [{ id, title, description, duration, ${sceneVisualJsonFields()} }] }`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildCreatorStructureLayer(): string {
  return [
    `CREATOR RETENTION STRUCTURE (mandatory beat order):`,
    `Hook → Problem → Empathy → Solution → Proof → Payoff → CTA`,
    ...RETENTION_SCENE_BEATS.map(
      (b) => `Scene ${b.sceneIndex} ${b.label}: ${b.instruction}`
    ),
    `Write natural spoken narration — NO quote spam, NO AI poetry, NO philosophical one-liners.`,
  ].join('\n')
}

function buildStructureLayer(_structure: VirloContext['structure']): string {
  return buildCreatorStructureLayer()
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
  candidates: VirloContext['hooks'],
  viralStructure?: ViralStructureAnalysis
): string {
  const hookSeed = viralStructure?.hook ?? selected.text
  return [
    `HOOK ENGINE (creator-native — retention, not quotes):`,
    `- Opening hook seed: ${hookSeed}`,
    `- Reference pattern: ${selected.pattern} (tension ${selected.tensionScore.toFixed(1)})`,
    `- Generate 3 variations in hookVariations; strongest becomes "hook".`,
    `- Alternate patterns considered: ${candidates
      .slice(1, 4)
      .map((c) => c.pattern)
      .join(', ')}`,
    `- BANNED: "You're not afraid of…", wrapped quote hooks, motivational poster lines.`,
    `- REQUIRED: specific, spoken, platform-native — earns the first 2 seconds.`,
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
- Exactly ${sceneTarget} scenes mapped to Hook → Problem → Empathy → Solution → Proof → Payoff → CTA.
- Scene titles MUST use those beat labels.
- suggestedVoiceStyle must match story niche + tone intentionally.
- Natural creator narration — never quote-mode or philosophical spam.
- Every output must feel unique to this topic — no template filler.
`.trim()
}

export function buildVirloSystemPrompt(): string {
  return `You are Mugtee — cinematic AI studio powered by the VIRLO engine.
You think like a short-form creator, reel editor, and retention strategist combined.

Rules:
- Output strict JSON only. No markdown. No extra keys.
- Follow the creator retention structure and per-scene beat map exactly.
- Write natural spoken scripts — NOT motivational quotes, NOT AI poetry, NOT philosophy.
- Never reuse generic AI phrasing or cinematic quote templates.
- Every line must feel filmable, human, and niche-native.`.trim()
}
