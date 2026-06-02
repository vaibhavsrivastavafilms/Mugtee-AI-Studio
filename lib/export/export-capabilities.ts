export type ExportStrategy = 'webcodecs-ffmpeg-mux' | 'ffmpeg-transcode' | 'mediarecorder-fallback' | 'blocked'

export type ExportCapabilities = {
  canUseWebCodecs: boolean
  canUseFFmpeg: boolean
  canUseThreadedFFmpeg: boolean
  canUseWorker: boolean
  canUseOffscreenCanvas: boolean
  canUseWasm: boolean
  canUseMediaRecorder: boolean
  hasSharedArrayBuffer: boolean
  crossOriginIsolated: boolean
  hardwareConcurrency: number
  deviceMemoryGb: number | null
  recommendedStrategy: ExportStrategy
  warnings: string[]
  blockers: string[]
}

function hasWebCodecsEncoder(): boolean {
  if (typeof window === 'undefined') return false
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
}

export function detectExportCapabilities(): ExportCapabilities {
  const warnings: string[] = []
  const blockers: string[] = []

  if (typeof window === 'undefined') {
    return {
      canUseWebCodecs: false,
      canUseFFmpeg: false,
      canUseThreadedFFmpeg: false,
      canUseWorker: false,
      canUseOffscreenCanvas: false,
      canUseWasm: false,
      canUseMediaRecorder: false,
      hasSharedArrayBuffer: false,
      crossOriginIsolated: false,
      hardwareConcurrency: 1,
      deviceMemoryGb: null,
      recommendedStrategy: 'blocked',
      warnings,
      blockers: ['Browser export runs only in the client.'],
    }
  }

  const canUseWorker = typeof Worker !== 'undefined'
  const canUseOffscreenCanvas = typeof OffscreenCanvas !== 'undefined'
  const canUseWasm = typeof WebAssembly !== 'undefined'
  const canUseWebCodecs = hasWebCodecsEncoder()
  const canUseMediaRecorder = typeof MediaRecorder !== 'undefined'
  const crossOriginIsolated =
    typeof window !== 'undefined' && window.crossOriginIsolated === true
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'
  const canUseThreadedFFmpeg = crossOriginIsolated && hasSharedArrayBuffer && canUseWorker
  const canUseFFmpeg = canUseWasm && canUseWorker

  const nav = navigator as Navigator & { deviceMemory?: number }
  const hardwareConcurrency = nav.hardwareConcurrency ?? 1
  const deviceMemoryGb =
    typeof nav.deviceMemory === 'number' && Number.isFinite(nav.deviceMemory)
      ? nav.deviceMemory
      : null

  if (!canUseWasm) blockers.push('WebAssembly is not available in this browser.')
  if (!canUseWorker) blockers.push('Web Workers are required for FFmpeg.wasm.')
  if (!canUseFFmpeg) blockers.push('FFmpeg.wasm cannot run in this environment.')

  if (deviceMemoryGb !== null && deviceMemoryGb < 4) {
    warnings.push('Low device memory — long exports may fail or be slow.')
  }
  if (hardwareConcurrency < 4) {
    warnings.push('Limited CPU cores — encoding may take longer.')
  }
  if (!canUseWebCodecs) {
    warnings.push('WebCodecs unavailable — using FFmpeg frame encode fallback.')
  }
  if (!canUseThreadedFFmpeg) {
    warnings.push('Single-thread FFmpeg only (COOP/COEP + SharedArrayBuffer not enabled).')
  }
  if (!canUseOffscreenCanvas) {
    warnings.push('OffscreenCanvas unavailable — main-thread canvas rendering.')
  }

  let recommendedStrategy: ExportStrategy = 'blocked'
  if (blockers.length === 0) {
    if (canUseWebCodecs) recommendedStrategy = 'webcodecs-ffmpeg-mux'
    else if (canUseFFmpeg) recommendedStrategy = 'ffmpeg-transcode'
    else if (canUseMediaRecorder) recommendedStrategy = 'mediarecorder-fallback'
    else blockers.push('No supported browser export path.')
  }

  return {
    canUseWebCodecs,
    canUseFFmpeg,
    canUseThreadedFFmpeg,
    canUseWorker,
    canUseOffscreenCanvas,
    canUseWasm,
    canUseMediaRecorder,
    hasSharedArrayBuffer,
    crossOriginIsolated,
    hardwareConcurrency,
    deviceMemoryGb,
    recommendedStrategy,
    warnings,
    blockers,
  }
}
