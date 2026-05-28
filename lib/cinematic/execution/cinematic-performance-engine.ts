export function optimizeAtmosphereRender(): { preferReducedLayers: boolean } {
  if (typeof window === 'undefined') return { preferReducedLayers: false }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return { preferReducedLayers: reduced }
}

const IMMERSIVE_LOADING: Record<string, readonly string[]> = {
  generating: [
    'Your story world is unfolding…',
    'Emotional beats are taking shape…',
    'The arc gathers before the lens…',
  ],
  storyboard: [
    'Framing each beat with intention…',
    'Visual rhythm calibrates across scenes…',
    'Shot progression held in restraint…',
  ],
  voiceover: [
    'Finding the breath of your narration…',
    'Voice cadence aligns to your arc…',
    'Emphasis settles into human rhythm…',
  ],
  compile: [
    'Your world is becoming film…',
    'Sequence holds hook and pacing in rhythm…',
    'The reel gathers its final form…',
  ],
  preview: [
    'Anticipation before the first frame…',
    'Your story holds its cinematic pulse…',
    'Each beat arrives with held breath…',
  ],
}

export function immersiveLoadingCopy(stage: string, seed = 0): string {
  const pool = IMMERSIVE_LOADING[stage]
  if (pool) return pool[seed % pool.length]
  return 'The atmosphere holds…'
}

export function pacingAwareWaitMs(
  stage: string,
  attempt: number,
  preferReducedMotion = false
): number {
  const base = stage === 'compile' ? 2400 : stage === 'generating' ? 2800 : 2200
  const jitter = (attempt % 3) * 180
  return preferReducedMotion ? Math.round(base * 0.75) + jitter : base + jitter
}

export function shouldDeferNonCriticalAssets(): boolean {
  if (typeof window === 'undefined') return false
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return Boolean(conn?.saveData)
}
