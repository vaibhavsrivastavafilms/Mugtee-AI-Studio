import 'server-only'

import os from 'os'

export type ProcessMemorySnapshot = {
  heapUsed: number
  heapTotal: number
  rss: number
  external: number
  arrayBuffers: number
}

export function captureProcessMemory(): ProcessMemorySnapshot {
  const m = process.memoryUsage()
  return {
    heapUsed: m.heapUsed,
    heapTotal: m.heapTotal,
    rss: m.rss,
    external: m.external,
    arrayBuffers: m.arrayBuffers ?? 0,
  }
}

export function memoryMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10
}

export function formatMemorySnapshot(snapshot: ProcessMemorySnapshot): {
  heapUsage: number
  heapTotalMb: number
  rssMemory: number
  externalMb: number
  arrayBuffersMb: number
  freeSystemMb: number
} {
  return {
    heapUsage: memoryMb(snapshot.heapUsed),
    heapTotalMb: memoryMb(snapshot.heapTotal),
    rssMemory: memoryMb(snapshot.rss),
    externalMb: memoryMb(snapshot.external),
    arrayBuffersMb: memoryMb(snapshot.arrayBuffers),
    freeSystemMb: memoryMb(os.freemem()),
  }
}

/** Structured memory log before FFmpeg / Remotion encode. */
export function logMemoryTrace(
  payload: Record<string, unknown> & {
    projectId?: string | null
    jobId?: string | null
    sceneCount?: number
    resolution?: string
    fps?: number
    duration?: number
    estimatedFrames?: number
    renderer?: string
    codec?: string
    threads?: number
  }
): ProcessMemorySnapshot {
  const snapshot = captureProcessMemory()
  console.info(
    '[MEMORY_TRACE]',
    JSON.stringify({
      ...payload,
      ...formatMemorySnapshot(snapshot),
      processMemory: snapshot,
    })
  )
  return snapshot
}

export function logMockRender(payload: {
  VIDEO_RENDER_MOCK: boolean
  rendererUsed: string
  encoderUsed: string
  threads?: number
  preset?: string
  resolution?: string
  durationSec?: number
}): void {
  const snapshot = captureProcessMemory()
  console.info(
    '[MOCK_RENDER]',
    JSON.stringify({
      ...payload,
      ...formatMemorySnapshot(snapshot),
    })
  )
}
