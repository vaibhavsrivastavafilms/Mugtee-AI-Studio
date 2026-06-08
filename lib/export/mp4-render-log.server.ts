import 'server-only'

import fs from 'fs/promises'
import path from 'path'

const STEP_LABELS = [
  'Validate Assets',
  'Build Timeline',
  'Prepare Scene Media',
  'Merge Audio',
  'Render MP4',
  'Save Output',
] as const

export type Mp4RenderStep = 1 | 2 | 3 | 4 | 5 | 6

const LOG_DIR = path.join(process.cwd(), 'logs')
const LOG_FILE = path.join(LOG_DIR, 'mp4-render.log')

export type Mp4RenderDiagnostics = {
  projectId?: string | null
  jobId?: string | null
  sceneCount?: number
  durationSec?: number
  fps?: number
  resolution?: string
  voiceUrl?: string | null
  musicUrl?: string | null
  outputPath?: string | null
  [key: string]: unknown
}

async function appendToLogFile(line: string): Promise<void> {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true })
    await fs.appendFile(LOG_FILE, `${line}\n`, 'utf8')
  } catch {
    /* non-fatal — console logging still available */
  }
}

export function mp4RenderLog(
  step: Mp4RenderStep,
  message: string,
  payload?: Mp4RenderDiagnostics
): void {
  const label = STEP_LABELS[step - 1]
  const line = `[MP4_RENDER] Step ${step}: ${label} — ${message}`
  const enriched: Mp4RenderDiagnostics = {
    timestamp: new Date().toISOString(),
    ...payload,
  }

  if (Object.keys(enriched).length > 0) {
    console.info(line, enriched)
    void appendToLogFile(`${enriched.timestamp} ${line} ${JSON.stringify(enriched)}`)
  } else {
    console.info(line)
    void appendToLogFile(`${new Date().toISOString()} ${line}`)
  }
}
