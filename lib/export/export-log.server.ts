import 'server-only'

type ExportLogLevel = 'debug' | 'info' | 'error'

function shouldLog(level: ExportLogLevel): boolean {
  if (level === 'error') return true
  return process.env.EXPORT_DEBUG === 'true' || process.env.NODE_ENV !== 'production'
}

function write(level: ExportLogLevel, step: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return
  const ts = new Date().toISOString()
  const payload = data ? ` ${JSON.stringify({ ts, ...data })}` : ` ${JSON.stringify({ ts })}`
  const line = `[export] ${step}${payload}`
  if (level === 'error') console.error(line)
  else console.log(line)
}

/** Structured server-side export pipeline logging (grep: `[export]`). */
export const exportLog = {
  exportStart: (data: Record<string, unknown>) => write('info', 'exportStart', data),
  requested: (data: Record<string, unknown>) => write('info', 'export requested', data),
  voiceLoaded: (data: Record<string, unknown>) => write('info', 'voiceLoaded', data),
  imagesLoaded: (data: Record<string, unknown>) => write('info', 'imagesLoaded', data),
  timelineBuilt: (data: Record<string, unknown>) => write('info', 'timelineBuilt', data),
  ffmpegStarted: (data: Record<string, unknown>) => write('info', 'ffmpegStarted', data),
  ffmpegCompleted: (data: Record<string, unknown>) => write('info', 'ffmpegCompleted', data),
  renderStarted: (data: Record<string, unknown>) => write('info', 'render started', data),
  renderComplete: (data: Record<string, unknown>) => write('info', 'render complete', data),
  uploadStarted: (data: Record<string, unknown>) => write('info', 'uploadStarted', data),
  uploadComplete: (data: Record<string, unknown>) => write('info', 'uploadCompleted', data),
  urlGenerated: (data: Record<string, unknown>) => write('info', 'url generated', data),
  downloadServed: (data: Record<string, unknown>) => write('info', 'download served', data),
  poll: (data: Record<string, unknown>) => write('debug', 'poll status', data),
  assetValidation: (data: Record<string, unknown>) => write('info', 'asset validation', data),
  error: (step: string, err: unknown, data?: Record<string, unknown>) => {
    const message = err instanceof Error ? err.message : String(err)
    write('error', `failed: ${step}`, { error: message.slice(0, 300), ...data })
  },
}
