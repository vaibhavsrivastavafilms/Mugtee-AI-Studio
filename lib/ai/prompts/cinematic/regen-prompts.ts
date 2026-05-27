import { buildNicheLayer } from '@/lib/cinematic/niches'
import { buildHookLayer } from '@/lib/ai/prompts/cinematic/output-format'
import { buildCaptionLayer } from '@/lib/ai/prompts/cinematic/output-format'
import { buildVisualLayer, sceneVisualJsonFields } from '@/lib/ai/prompts/cinematic/visual-layer'
import type { RegenProjectContext } from '@/lib/cinematic/regen-context'
import {
  captionsFromLines,
  sceneDescription,
  scenePacingRole,
} from '@/lib/cinematic/regen-context'

export function buildHookRegenPrompt(ctx: RegenProjectContext): string {
  return [
    `Refine ONLY the opening hook for this vertical cinematic reel.`,
    `Creator brief: "${ctx.topic || ctx.prompt}"`,
    `Tone: ${ctx.tone} · Duration: ${ctx.duration}s`,
    buildNicheLayer(ctx.niche),
    buildHookLayer(),
    `Current hook (improve — do not repeat verbatim): "${ctx.hook || '—'}"`,
    `Summary context: ${ctx.summary.slice(0, 400) || '—'}`,
    `Script excerpt: ${ctx.script.slice(0, 500) || '—'}`,
    `Output JSON only:
{
  "hookVariations": ["v1", "v2", "v3"],
  "hook": "strongest hook only"
}`,
  ].join('\n\n')
}

export function buildSceneRegenPrompt(
  ctx: RegenProjectContext,
  sceneIndex: number
): string {
  const target = ctx.scenes.find((s) => s.index === sceneIndex)
  if (!target) throw new Error('Scene not found')

  const total = ctx.scenes.length
  const role = scenePacingRole(sceneIndex, total)
  const neighbors = ctx.scenes
    .filter((s) => s.index !== sceneIndex)
    .map(
      (s) =>
        `Scene ${s.index} (${scenePacingRole(s.index, total)}): "${s.title || 'Beat'}" — ${sceneDescription(s).slice(0, 180)}`
    )
    .join('\n')

  return [
    `Regenerate ONE scene beat only. Preserve story sequence and emotional escalation.`,
    `Project: "${ctx.topic || ctx.prompt}" · Niche locked: ${ctx.niche}`,
    buildNicheLayer(ctx.niche),
    `Target: Scene ${sceneIndex} of ${total} — pacing role: ${role}`,
    `Current scene title: "${target.title || `Scene ${sceneIndex}`}"`,
    `Current description: "${sceneDescription(target).slice(0, 400) || '—'}"`,
    `Duration target: ${target.duration ?? Math.max(2, Math.round(ctx.duration / Math.max(total, 1)))}s`,
    `Hook: "${ctx.hook.slice(0, 160) || '—'}"`,
    `Other scenes (stay distinct — no repetition):
${neighbors || '—'}`,
    `Requirements:
- Vertical 9:16 — specify what we SEE + what we FEEL
- Match ${role} in the emotional arc
- Do not duplicate framing or beats from other scenes`,
    `Output JSON only:
{
  "title": "beat title",
  "description": "see + feel",
  "duration": ${target.duration ?? 4},
  ${sceneVisualJsonFields()}
}`,
  ].join('\n\n')
}

export function buildVisualEnhancePrompt(
  ctx: RegenProjectContext,
  sceneIndex: number
): string {
  const target = ctx.scenes.find((s) => s.index === sceneIndex)
  if (!target) throw new Error('Scene not found')

  const total = ctx.scenes.length
  const role = scenePacingRole(sceneIndex, total)

  return [
    `Enhance ONLY visual direction for Scene ${sceneIndex}. Do NOT change story beat, narration, hook, or pacing role.`,
    `Project: "${ctx.topic || ctx.prompt}" · Niche: ${ctx.niche}`,
    buildNicheLayer(ctx.niche),
    buildVisualLayer(),
    `Scene ${sceneIndex} of ${total} — pacing role: ${role}`,
    `Beat title: "${target.title || `Scene ${sceneIndex}`}"`,
    `Narration (preserve meaning): "${sceneDescription(target).slice(0, 400) || '—'}"`,
    `Current visual prompt: "${target.visualPrompt?.slice(0, 300) || '—'}"`,
    `Hook context: "${ctx.hook.slice(0, 120) || '—'}"`,
    `Output JSON only:
{
  ${sceneVisualJsonFields()}
}`,
  ].join('\n\n')
}

export function buildCaptionImprovePrompt(ctx: RegenProjectContext): string {
  const current = captionsFromLines(ctx.captionLines)

  return [
    `Improve captions only — stronger emotional pull, cleaner short-form phrasing.`,
    `Project: "${ctx.topic || ctx.prompt}" · Niche: ${ctx.niche}`,
    buildNicheLayer(ctx.niche),
    buildCaptionLayer(),
    `Hook: "${ctx.hook.slice(0, 160) || '—'}"`,
    `Summary: ${ctx.summary.slice(0, 300) || '—'}`,
    `Current caption:
- primary: "${current.primary || '—'}"
- cta: "${current.cta || '—'}"
- hashtags: ${current.hashtags.join(', ') || '—'}`,
    `Improve all three. Max 3 niche-relevant hashtags. No spam clichés.`,
  ].join('\n\n')
}

export function buildVoiceSuggestPrompt(ctx: RegenProjectContext): string {
  const sceneArc = ctx.scenes
    .map(
      (s) =>
        `Scene ${s.index}: ${s.title || 'Beat'} — ${sceneDescription(s).slice(0, 100)}`
    )
    .join('\n')

  return [
    `Recommend the best narrator voice style for this cinematic reel.`,
    `Niche: ${ctx.niche} · Tone: ${ctx.tone}`,
    buildNicheLayer(ctx.niche),
    `Hook: "${ctx.hook.slice(0, 160) || '—'}"`,
    `Summary: ${ctx.summary.slice(0, 250) || '—'}`,
    `Scene emotional arc:
${sceneArc || ctx.summary.slice(0, 200) || '—'}`,
    `Current suggestion: ${ctx.suggestedVoiceStyle || 'none'}`,
    `Pick ONE style that matches niche + emotional pacing intentionally:
warm_documentary | emotional_cinematic | deep_trailer | calm_storyteller`,
    `Output JSON only:
{
  "suggestedVoiceStyle": "warm_documentary | emotional_cinematic | deep_trailer | calm_storyteller",
  "reason": "one short sentence"
}`,
  ].join('\n\n')
}
