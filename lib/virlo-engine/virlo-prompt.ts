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
import type { SelectedScriptArchetype } from '@/lib/cinematic/script-archetypes'
import {
  buildBannedScriptPhrasesSection,
  buildNarrativeStructurePromptSection,
} from '@/lib/cinematic/narrative-structure-engine'
import type { HookFramework, SelectedContentAngle } from '@/lib/cinematic/content-angle-engine'
import {
  buildContentAnglePromptSection,
  buildHookFrameworkPromptSection,
  buildTitleOriginalityRules,
} from '@/lib/cinematic/content-angle-engine'

export function buildVirloScriptPrompt(
  ctx: VirloContext,
  viralStructure?: ViralStructureAnalysis,
  scriptArchetype?: SelectedScriptArchetype,
  contentAngle?: SelectedContentAngle,
  hookFramework?: HookFramework
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
      : buildCreatorStructureLayer(scriptArchetype),
    buildEmotionLayer(ctx),
    buildRetentionLayer(retention),
    pacingPromptFragment(ctx.pacing),
    buildCreativeSeedLayer(ctx),
    buildHookDirectiveLayer(selectedHook, hooks, viralStructure),
    contentAngle ? buildContentAnglePromptSection(contentAngle) : '',
    hookFramework ? buildHookFrameworkPromptSection(hookFramework) : '',
    buildTitleOriginalityRules(),
    buildNicheLayer(topicAnalysis.niche),
    buildVisualDirectiveLayer(ctx),
    buildCaptionLayer(),
    buildOutputFormatLayer(ctx.sceneTarget, ctx.duration),
  ].join('\n\n')
}

export function buildVirloTitlePrompt(
  ctx: VirloContext,
  contentAngle?: SelectedContentAngle,
  hookFramework?: HookFramework
): string {
  return [
    `Generate a viral short-form title and hook for this idea using VIRLO structure "${ctx.structure.name}".`,
    `Idea: "${ctx.idea}"`,
    `Niche: ${ctx.topicAnalysis.niche}`,
    `Emotional goal: ${ctx.emotionalGoal}`,
    `Preferred hook pattern: ${ctx.selectedHook.pattern}`,
    `Hook tension reference (adapt, do not copy verbatim): ${ctx.selectedHook.text}`,
    `Opening move: ${ctx.structure.openingMove}`,
    contentAngle ? buildContentAnglePromptSection(contentAngle) : '',
    hookFramework ? buildHookFrameworkPromptSection(hookFramework) : '',
    buildTitleOriginalityRules(),
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

function buildCreatorStructureLayer(scriptArchetype?: SelectedScriptArchetype): string {
  if (scriptArchetype) {
    return [
      buildNarrativeStructurePromptSection(scriptArchetype),
      `Populate scriptBeats[] with: label (mandatory scene label from structure), narration (1 sentence), duration ("4s"), emotion per beat.`,
      `scenes[].title MUST match scriptBeats[].label — never "Beat 1", "Problem", "Solution", or "Outcome".`,
      `Payoff + CTA must be original every generation — reference the creator brief topic, not reusable motivational templates.`,
      `Write spoken cinematic beats — NO blog tone, NO quote spam, NO AI poetry, NO paragraphs.`,
    ].join('\n')
  }

  return [
    `MUGTEE SCRIPT SOP (reel-native beats — NOT essay):`,
    `HOOK (max 20 words) → SCRIPT BEATS (8–12 one-sentence beats, 3–8s each) → PAYOFF → CTA`,
    buildBannedScriptPhrasesSection(),
    `Arc guidance: spread hook → context → escalation → insight → payoff → CTA across beats — vary emotion labels per beat.`,
    ...RETENTION_SCENE_BEATS.map(
      (b) => `Beat arc ${b.sceneIndex} "${b.label}": ${b.instruction}`
    ),
    `Populate scriptBeats[] with label, narration (1 sentence), duration ("4s"), emotion per beat.`,
    `Payoff + CTA must be original every generation — reference the creator brief topic, not reusable motivational templates.`,
    `Write spoken cinematic beats — NO blog tone, NO quote spam, NO AI poetry, NO paragraphs.`,
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
OUTPUT FORMAT (exact JSON shape — scriptBeats is PRIMARY):
{
  "title": "short cinematic project title (optional — derive from hook)",
  "hookVariations": ["variation 1", "variation 2", "variation 3"],
  "hook": "strongest hook only — max 20 words, pattern interrupt",
  "scriptBeats": [
    { "label": "Cold Open", "narration": "one sentence voiceover line", "duration": "4s", "emotion": "stillness" },
    { "label": "Context", "narration": "...", "duration": "5s", "emotion": "curiosity" }
  ],
  "payoff": "single emotional landing line",
  "cta": "short creator engagement prompt",
  "summary": "1-2 sentence reel summary",
  "script": "optional flat voiceover — auto-derived from beats if omitted",
  "scenes": [
    { "id": "scene-1", "title": "Cold Open", "description": "same as scriptBeats[0].narration", "duration": 4,
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
- Exactly 8–12 scriptBeats; one sentence per beat; duration 3s–8s each (e.g. "4s"); label required from narrative structure.
- hook max 20 words. payoff and cta required.
- Populate scenes (one per beat, up to ${sceneTarget}) from scriptBeats — title = beat label, description = narration.
- ${duration}s runtime — beat durations should sum near target.
- suggestedVoiceStyle must match niche + tone.
- Unique to this topic — no template filler or essay voice.
`.trim()
}

export function buildVirloSystemPrompt(): string {
  return `You are Mugtee — cinematic AI studio for vertical reels.
You think like a reel editor, retention strategist, and visual storyteller.

Rules:
- Output strict JSON only. No markdown. No extra keys beyond the schema.
- Follow Mugtee Script SOP: hook + scriptBeats (narration, duration, emotion) × 8–12 + payoff + cta.
- Reel-native voice: one sentence per beat, 3–8s timing — NOT blogs, essays, GPT explainers, or paragraphs.
- Never motivational quote spam, AI poetry, or philosophical one-liners.
- Every beat must be filmable, human, and niche-native.`.trim()
}
