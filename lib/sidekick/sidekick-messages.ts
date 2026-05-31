/** Static / rotating Sidekick copy — no memory, no API. */

export const SIDEKICK_GREETINGS = [
  "I'm here when you're ready to create.",
  "Let's turn today's idea into something cinematic.",
  "Your next reel starts with one honest sentence.",
  "I've got hooks, scripts, and storyboards on standby.",
] as const

export const SIDEKICK_ENCOURAGEMENT = [
  'Small consistent reels beat one perfect draft.',
  'Your audience feels authenticity — lead with truth.',
  'One strong hook can carry the whole reel.',
  'Finish beats perfect. Ship, then refine.',
] as const

export const SIDEKICK_HOOK_TIPS = [
  'Pattern-interrupt in the first 1.5 seconds — question, contrast, or bold claim.',
  'Open on emotion, not explanation.',
  'Name the viewer\'s tension before you offer the payoff.',
  'Specific beats generic every time in hooks.',
] as const

export const SIDEKICK_IDLE_NUDGES = [
  "Haven't created this week? One reel keeps the rhythm alive.",
  'A 60-second reel today beats a perfect script tomorrow.',
  "Pick a topic — I'll handle hook, script, and storyboard.",
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
