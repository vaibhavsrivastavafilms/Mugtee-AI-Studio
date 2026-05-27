export { selectCinematicHook as refineEmotionalOpening } from '@/lib/cinematic/execution/cinematic-hook-engine'

export function openingCuriosityScore(hook: string): number {
  const text = hook.trim()
  let score = 0
  if (/\?/.test(text)) score += 2
  if (/\b(never|before|until|secret|quiet|empty)\b/i.test(text)) score += 1.5
  if (text.length >= 20 && text.length <= 140) score += 1
  return score
}
