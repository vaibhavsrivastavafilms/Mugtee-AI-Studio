/** Static / rotating Sidekick copy — no memory, no API. Mugtee character voice. */

export const SIDEKICK_GREETINGS = [
  "Bhai, I'm here. One honest sentence and we build.",
  'Okay real talk — your next reel starts now.',
  "Yaar, hooks and scripts on standby. Let's go.",
  "I've watched too many channels die from overthinking. Not yours.",
] as const

export const SIDEKICK_ENCOURAGEMENT = [
  'The algorithm is not your enemy. Your consistency is.',
  'One strong hook beats three perfect drafts sitting in Projects.',
  'Your audience is smarter than you think — give them credit.',
  'Ship today. Refine tomorrow. I said what I said.',
] as const

export const SIDEKICK_HOOK_TIPS = [
  'First 1.5 seconds — question, contrast, or bold claim. No warm-up.',
  'Your hook needs stakes. Why should I keep watching? Give me a reason.',
  'Government-form energy? Chal hatt. Open mid-tension.',
  'Specific beats generic every time. Name the viewer\'s tension first.',
] as const

export const SIDEKICK_IDLE_NUDGES = [
  "Haven't posted in a bit? I already have a topic for you. Very small pressure.",
  'A 60-second reel today beats a perfect script tomorrow. Sahi bola.',
  "Pick a topic — I'll handle hook, script, and storyboard. You just show up.",
] as const

export function pickSidekickMessage(seed: number, pool: readonly string[]): string {
  if (!pool.length) return ''
  return pool[Math.abs(seed) % pool.length]
}

export function buildSidekickRotation(seed: number): string {
  const pools = [SIDEKICK_GREETINGS, SIDEKICK_ENCOURAGEMENT, SIDEKICK_HOOK_TIPS, SIDEKICK_IDLE_NUDGES]
  const pool = pools[Math.abs(seed) % pools.length]
  return pickSidekickMessage(seed >> 2, pool)
}
