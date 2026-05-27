import type { CinematicNiche } from '@/lib/cinematic/niches'
import { NICHE_VISUAL } from '@/lib/cinematic/visual-direction'

export function atmosphereColorSystem(niche: CinematicNiche): {
  primary: string
  accent: string
  shadow: string
} {
  const visual = NICHE_VISUAL[niche]
  const parts = visual.palette.split(/[+,]/).map((p) => p.trim())
  return {
    primary: parts[0] ?? visual.palette,
    accent: parts[1] ?? 'restrained gold highlight',
    shadow: 'deep cinematic shadow, not crushed black',
  }
}

export function emotionalVisualPalette(niche: CinematicNiche): string {
  return NICHE_VISUAL[niche].palette
}

export function cinematicWorldLighting(niche: CinematicNiche, role: string): string {
  const base = NICHE_VISUAL[niche].lighting
  if (role === 'peak') return `${base}, tighter contrast on subject`
  if (role === 'aftertaste') return `${base}, softer falloff, lingering warmth`
  return base
}
