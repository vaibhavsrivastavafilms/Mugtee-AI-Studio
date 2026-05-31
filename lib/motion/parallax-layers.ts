import type { CSSProperties } from 'react'

export type ParallaxLayerSpec = {
  id: 'background' | 'mid' | 'foreground'
  scale: number
  translateX: number
  translateY: number
  opacity: number
  blurPx?: number
}

/** Simulated depth from a single still — no AI segmentation (V1). */
export function buildParallaxLayers(input: {
  progress: number
  baseScale: number
  translateX: number
  translateY: number
  offset?: number
  depthEnabled?: boolean
}): ParallaxLayerSpec[] {
  const offset = input.depthEnabled === false ? 0 : (input.offset ?? 18)
  const drift = input.progress * offset

  return [
    {
      id: 'background',
      scale: input.baseScale * 0.94,
      translateX: input.translateX - drift * 0.35,
      translateY: input.translateY + 4,
      opacity: 1,
      blurPx: 2,
    },
    {
      id: 'mid',
      scale: input.baseScale * 1.02,
      translateX: input.translateX + drift * 0.2,
      translateY: input.translateY - 2,
      opacity: 0.55,
    },
    {
      id: 'foreground',
      scale: input.baseScale * 1.08,
      translateX: input.translateX + drift * 0.65,
      translateY: input.translateY - 5,
      opacity: 0.32,
    },
  ]
}

export function parallaxLayerStyle(layer: ParallaxLayerSpec): CSSProperties {
  const filter = layer.blurPx ? `blur(${layer.blurPx}px)` : undefined
  return {
    transform: `scale(${layer.scale}) translate(${layer.translateX}px, ${layer.translateY}px)`,
    opacity: layer.opacity,
    filter,
  }
}
