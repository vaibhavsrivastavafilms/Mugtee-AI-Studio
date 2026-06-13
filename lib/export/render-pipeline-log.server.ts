import 'server-only'

import fs from 'fs/promises'
import path from 'path'

export type RenderPipelineStage =
  | 'EXPORT_START'
  | 'RENDER_PREP'
  | 'REMOTION_COMPOSITION'
  | 'REMOTION_RENDER_START'
  | 'REMOTION_RENDER_COMPLETE'
  | 'FFMPEG_START'
  | 'FFMPEG_COMPLETE'
  | 'FFMPEG_OUTPUT'
  | 'UPLOAD_START'
  | 'UPLOAD_COMPLETE'
  | 'UPLOAD_VERIFY'
  | 'DOWNLOAD_VERIFY'
  | 'MP4_DOWNLOAD_VERIFY'

const LOG_DIR = path.join(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'render-pipeline.log')

export type RenderPipelineLogPayload = {
  projectId?: string | null
  jobId?: string | null
  frameCount?: number
  audioExists?: boolean
  duration?: number
  durationSec?: number
  outputPath?: string | null
  status?: string
  sceneCount?: number
  codec?: string
  size?: number
  storagePath?: string | null
  videoUrl?: string | null
  error?: string
  stack?: string
  [key: string]: unknown
}

async function appendLine(line: string): Promise<void> {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true })
    await fs.appendFile(LOG_FILE, `${line}\n`, 'utf8')
  } catch {
    /* non-fatal */
  }
}

/** Structured render pipeline stage log — always emitted (including production). */
export function renderPipelineLog(
  stage: RenderPipelineStage,
  payload: RenderPipelineLogPayload = {}
): void {
  const enriched = {
    timestamp: new Date().toISOString(),
    ...payload,
  }
  console.info(`[${stage}]`, enriched)
  void appendLine(`[${stage}] ${JSON.stringify(enriched)}`)
}

export function renderPipelineError(
  stage: RenderPipelineStage,
  err: unknown,
  payload: RenderPipelineLogPayload = {}
): void {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  renderPipelineLog(stage, {
    ...payload,
    status: 'failed',
    error: message,
    stack: stack?.slice(0, 4000),
  })
}
