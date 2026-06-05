import { frequenciesToPercentages } from '@/lib/director/memory/memory-score'
import type { CreatorMemoryProfile } from '@/lib/director/memory/types'

/** Format director-specific creator memory for LLM injection (Director Mode only). */
export function formatDirectorCreatorMemoryForPrompt(
  memory: CreatorMemoryProfile | null | undefined
): string {
  if (!memory) return ''

  const projects = memory.storyMemory.projectCount
  if (projects <= 0) return ''

  const sections: string[] = ['DIRECTOR CREATOR MEMORY (learned from past projects):']

  const frameworks = frequenciesToPercentages(memory.storyMemory.frameworks, 4)
  if (frameworks.length) {
    sections.push(
      `Story frameworks: ${frameworks.map((f) => `${f.label} (${f.percent}%)`).join(', ')}`
    )
  }

  const hooks = frequenciesToPercentages(memory.storyMemory.hookStyles, 3)
  if (hooks.length) {
    sections.push(`Hook styles: ${hooks.map((h) => `${h.label} (${h.percent}%)`).join(', ')}`)
  }

  const arcs = frequenciesToPercentages(memory.storyMemory.emotionalArcs, 3)
  if (arcs.length) {
    sections.push(`Emotional arcs: ${arcs.map((a) => `${a.label} (${a.percent}%)`).join(', ')}`)
  }

  const shots = frequenciesToPercentages(memory.visualMemory.shotTypes, 4)
  if (shots.length) {
    sections.push(`Camera shots: ${shots.map((s) => `${s.label} (${s.percent}%)`).join(', ')}`)
  }

  const lighting = frequenciesToPercentages(memory.visualMemory.lighting, 3)
  if (lighting.length) {
    sections.push(`Lighting: ${lighting.map((l) => `${l.label} (${l.percent}%)`).join(', ')}`)
  }

  const palettes = frequenciesToPercentages(memory.visualMemory.colorPalettes, 3)
  if (palettes.length) {
    sections.push(`Color palettes: ${palettes.map((p) => `${p.label} (${p.percent}%)`).join(', ')}`)
  }

  const tones = frequenciesToPercentages(memory.voiceMemory.narratorTones, 3)
  if (tones.length) {
    sections.push(`Voice tone: ${tones.map((t) => `${t.label} (${t.percent}%)`).join(', ')}`)
  }

  const pacing = frequenciesToPercentages(memory.voiceMemory.pacing, 3)
  if (pacing.length) {
    sections.push(`Voice pacing: ${pacing.map((p) => `${p.label} (${p.percent}%)`).join(', ')}`)
  }

  const motion = frequenciesToPercentages(memory.motionMemory.motionStyles, 4)
  if (motion.length) {
    sections.push(`Motion style: ${motion.map((m) => `${m.label} (${m.percent}%)`).join(', ')}`)
  }

  const prefs = memory.creatorPreferences
  const prefLines: string[] = []
  if (prefs.avgSceneCount > 0) {
    prefLines.push(`avg ${Math.round(prefs.avgSceneCount)} scenes`)
  }
  if (prefs.avgDurationSec > 0) {
    prefLines.push(`~${Math.round(prefs.avgDurationSec)}s duration`)
  }
  if (prefs.preferredGenre) prefLines.push(`genre: ${prefs.preferredGenre}`)
  if (prefs.preferredMood) prefLines.push(`mood: ${prefs.preferredMood}`)
  if (prefLines.length) {
    sections.push(`Creator preferences: ${prefLines.join(' · ')}`)
  }

  sections.push(
    `Projects learned from: ${projects}. Mirror these instincts — do not copy prior scripts verbatim.`
  )

  return sections.filter(Boolean).join('\n')
}
