/**
 * Persistent checkpoints — resume from scene / phase without restarting the movie.
 */

import type { ProductionOsV3Checkpoint } from '@/lib/production-os/v3/types'
import { PRODUCTION_OS_V3 } from '@/lib/production-os/v3/types'

const KEY = 'mugtee:production-os-v3-checkpoint'

export function saveProductionCheckpoint(checkpoint: ProductionOsV3Checkpoint): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${KEY}:${checkpoint.projectId}`, JSON.stringify(checkpoint))
  } catch {
    /* quota */
  }
}

export function loadProductionCheckpoint(
  projectId: string
): ProductionOsV3Checkpoint | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${KEY}:${projectId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ProductionOsV3Checkpoint
    if (parsed.version !== PRODUCTION_OS_V3) return null
    return parsed
  } catch {
    return null
  }
}

export function clearProductionCheckpoint(projectId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`${KEY}:${projectId}`)
  } catch {
    /* ignore */
  }
}
