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
import { rotatedHookFramework } from '@/lib/cinematic/hook-variation'
import { languageDirective } from '@/lib/cinematic/language-prompt'
import {
  buildContentAnglePromptSection,
  buildHookFrameworkPromptSection,
  buildTitleOriginalityRules,
  getContentAngle,
  normalizeContentAngleId,
  type SelectedContentAngle,
} from '@/lib/cinematic/content-angle-engine'

export type RegenAction = 'hook' | 'scene' | 'storyboard' | 'caption' | 'all'

function buildVisualStyleLock(ctx: RegenProjectContext): string {
  const vs = ctx.visualStyle
  if (!vs) return ''
  return [
    `LOCKED VISUAL STYLE (preserve — do NOT switch to generic luxury/gold/cinematic defaults):`,
    `- Label: ${vs.label}`,
    `- Palette: ${vs.palette}`,
    `- Camera: ${vs.camera}`,
    `- Lighting: ${vs.lighting}`,
    `- Movement: ${vs.movement}`,
    `- Environment: ${vs.environment}`,
  ].join('\n')
}

function buildViralScriptBlock(ctx: RegenProjectContext): string {
  const vs = ctx.viralScript
  if (!vs) return ''
  const parts = [
    vs.retention_pattern
      ? `Locked retention pattern (preserve): ${vs.retention_pattern}`
      : '',
    vs.script?.trim() ? `Virlo script anchor: ${vs.script.slice(0, 400)}` : '',
  ].filter(Boolean)
  return parts.length ? parts.join('\n') : ''
}

function buildPreserveBlock(action: RegenAction, ctx: RegenProjectContext): string {
  const rules: Record<RegenAction, string> = {
    hook: 'Preserve: language, visual style, full script. Change ONLY the opening hook.',
    scene: 'Preserve: language, visual style, hook. Change ONLY this scene beat content.',
    storyboard: 'Preserve: language, script, visual style. Change ONLY visual direction fields.',
    caption: 'Preserve: language, script. Change ONLY caption pack.',
    all: 'Preserve: language, visual style, niche, and topic. Generate COMPLETELY FRESH hook, script, scenes, and visuals. Do NOT repeat previous script wording or reuse prior scene beats verbatim.',
  }
  const parts = [
    rules[action],
    languageDirective(ctx.language, { isMixed: ctx.languageMixed }),
  ]
  const viralBlock = buildViralScriptBlock(ctx)
  if (viralBlock && action !== 'caption') parts.push(viralBlock)
  const styleLock = buildVisualStyleLock(ctx)
  if (styleLock && action !== 'caption') {
    parts.push(styleLock)
  }
  if (action === 'all' && ctx.script.trim()) {
    parts.push(
      `Previous script to avoid (generate a fresh variation — do not copy):\n${ctx.script.slice(0, 1500)}`
    )
  }
  if (action === 'hook' && ctx.script.trim()) {
    parts.push(`Full script (do NOT rewrite): ${ctx.script.slice(0, 1200)}`)
  }
  if (action === 'scene' && ctx.hook.trim()) {
    parts.push(`Locked hook: "${ctx.hook.slice(0, 220)}"`)
  }
  if ((action === 'storyboard' || action === 'caption') && ctx.script.trim()) {
    parts.push(`Script context: ${ctx.script.slice(0, 800)}`)
  }
  return parts.filter(Boolean).join('\n\n')
}

export function buildHookRegenPrompt(ctx: RegenProjectContext): string {
  const avoidHooks = [
    ...ctx.previousHooks,
    ...(ctx.hook ? [ctx.hook] : []),
  ].filter(Boolean)

  const framework = rotatedHookFramework(ctx.hookVariantIndex)
  const emotionalTone = ctx.emotionalGoal || ctx.tone
  const angleId = normalizeContentAngleId(ctx.contentAngleId)
  const contentAngle: SelectedContentAngle | null = angleId ? getContentAngle(angleId) : null

  const avoidBlock =
    avoidHooks.length > 0
      ? [
          `Previously used hooks this session — Do NOT repeat, paraphrase, or echo these openings:`,
          ...avoidHooks.map((h, i) => `${i + 1}. "${h}"`),
        ].join('\n')
      : ''

  const variationBlock = ctx.strongVariation
    ? [
        `MAXIMUM DIVERGENCE REQUIRED.`,
        `The last attempt was too similar to a previous hook.`,
        `Choose a completely different emotional entry point, sentence structure, and rhetorical device.`,
        `Do not reuse key phrases, metaphors, or the same opening words as any prior hook.`,
      ].join('\n')
    : [
        `Generate ONE completely new hook.`,
        `Different opening pattern, different emotional angle, cinematic and retention-optimized.`,
        `Do not start with similar wording to any previous hook.`,
        `This should feel like another way to tell the same story — not a rewrite.`,
      ].join('\n')

  return [
    buildPreserveBlock('hook', ctx),
    `Refine ONLY the opening hook for this vertical cinematic reel.`,
    `Original creator idea: "${ctx.topic || ctx.prompt}"`,
    `Niche: ${ctx.niche}`,
    `Emotional tone: ${emotionalTone}`,
    `Tone / style: ${ctx.tone} · Duration: ${ctx.duration}s`,
    contentAngle ? buildContentAnglePromptSection(contentAngle) : '',
    buildTitleOriginalityRules(),
    buildNicheLayer(ctx.niche),
    buildHookLayer(),
    buildHookFrameworkPromptSection(framework),
    avoidBlock,
    variationBlock,
    `Current hook (replace entirely): "${ctx.hook || '—'}"`,
    `Summary context: ${ctx.summary.slice(0, 400) || '—'}`,
    `Output JSON only:
{
  "hookFramework": "${framework.id}",
  "hook": "single strongest hook only — one sentence, cinematic, under 220 chars"
}`,
  ]
    .filter(Boolean)
    .join('\n\n')
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
    buildPreserveBlock('scene', ctx),
    `Regenerate ONE scene beat only. Preserve story sequence and emotional escalation.`,
    `Project: "${ctx.topic || ctx.prompt}" · Niche locked: ${ctx.niche}`,
    buildNicheLayer(ctx.niche),
    `Target: Scene ${sceneIndex} of ${total} — pacing role: ${role}`,
    `Current scene title: "${target.title || `Scene ${sceneIndex}`}"`,
    `Current description: "${sceneDescription(target).slice(0, 400) || '—'}"`,
    `Duration target: ${target.duration ?? Math.max(2, Math.round(ctx.duration / Math.max(total, 1)))}s`,
    `Other scenes (stay distinct — no repetition):
${neighbors || '—'}`,
    `Requirements:
- Vertical 9:16 — specify what we SEE + what we FEEL
- Match ${role} in the emotional arc
- Do not duplicate framing or beats from other scenes
- Keep locked visual style palette and camera language`,
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
    buildPreserveBlock('storyboard', ctx),
    `Enhance ONLY visual direction for Scene ${sceneIndex}. Do NOT change story beat, narration, hook, or pacing role.`,
    `Project: "${ctx.topic || ctx.prompt}" · Niche: ${ctx.niche}`,
    buildNicheLayer(ctx.niche),
    buildVisualLayer(),
    `Scene ${sceneIndex} of ${total} — pacing role: ${role}`,
    `Beat title: "${target.title || `Scene ${sceneIndex}`}"`,
    `Narration (preserve meaning): "${sceneDescription(target).slice(0, 400) || '—'}"`,
    `Current visual prompt: "${target.visualPrompt?.slice(0, 300) || '—'}"`,
    `Output JSON only:
{
  ${sceneVisualJsonFields()}
}`,
  ].join('\n\n')
}

export function buildCaptionImprovePrompt(ctx: RegenProjectContext): string {
  const current = captionsFromLines(ctx.captionLines)

  return [
    buildPreserveBlock('caption', ctx),
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
    languageDirective(ctx.language, { isMixed: ctx.languageMixed }),
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
