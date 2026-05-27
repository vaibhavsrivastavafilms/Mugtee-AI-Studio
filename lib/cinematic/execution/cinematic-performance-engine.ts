export function optimizeAtmosphereRender(): { preferReducedLayers: boolean } {
  if (typeof window === 'undefined') return { preferReducedLayers: false }
  const reduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return { preferReducedLayers: reduced }
}

export function immersiveLoadingCopy(stage: string): string {
  const map: Record<string, string> = {
    generating: 'Directing your cinematic world…',
    storyboard: 'Framing emotional beats…',
    voiceover: 'Finding the voice of your story…',
    compile: 'Preparing immersive presentation…',
  }
  return map[stage] ?? 'Holding atmosphere…'
}

export function shouldDeferNonCriticalAssets(): boolean {
  if (typeof window === 'undefined') return false
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return Boolean(conn?.saveData)
}
