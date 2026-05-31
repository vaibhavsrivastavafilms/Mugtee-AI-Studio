/** Client-side WebGL and device capability checks for lightweight 3D surfaces. */

export function canUseWebGL(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')
    return Boolean(gl)
  } catch {
    return false
  }
}

/** Skip 3D on devices unlikely to render it smoothly (very low memory / cores). */
export function shouldPrefer2DFallback(): boolean {
  if (typeof navigator === 'undefined') return true
  if (!canUseWebGL()) return true

  const nav = navigator as Navigator & { deviceMemory?: number }
  if (nav.deviceMemory != null && nav.deviceMemory <= 2) return true
  if (navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 2) return true

  return false
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
