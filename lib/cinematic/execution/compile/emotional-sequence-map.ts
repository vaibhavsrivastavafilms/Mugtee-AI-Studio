export {
  buildEmotionalSequenceMap,
} from '@/lib/cinematic/execution/compile/cinematic-shot-plan'

export type { EmotionalSequenceBeat } from '@/lib/cinematic/execution/compile/emotional-film-plan'

export function sequencePacingLabel(
  beats: { emotionalWeight: string; durationSec: number }[]
): string {
  const peak = beats.find((b) => b.emotionalWeight === 'peak')
  const open = beats[0]
  if (!open) return 'Emotional arc held across beats'
  if (peak) {
    return `Opens in ${open.durationSec}s · peaks at beat ${beats.indexOf(peak) + 1} · holds with restraint`
  }
  return `${beats.length} beats · ${beats.reduce((s, b) => s + b.durationSec, 0)}s emotional arc`
}
