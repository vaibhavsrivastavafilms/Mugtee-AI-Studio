import 'server-only'

import fs from 'fs'
import os from 'os'
import path from 'path'

type ExportMetricsSnapshot = {
  exportSuccessCount: number
  exportFailureCount: number
  totalDurationMs: number
  averageExportTimeMs: number
  exportSuccessRate: number
  exportFailureRate: number
  lastUpdated: string
}

const METRICS_FILE = path.join(os.tmpdir(), 'mugtee-export-metrics.json')

let memory: ExportMetricsSnapshot = {
  exportSuccessCount: 0,
  exportFailureCount: 0,
  totalDurationMs: 0,
  averageExportTimeMs: 0,
  exportSuccessRate: 0,
  exportFailureRate: 0,
  lastUpdated: new Date().toISOString(),
}

function recompute(snapshot: Omit<ExportMetricsSnapshot, 'averageExportTimeMs' | 'exportSuccessRate' | 'exportFailureRate' | 'lastUpdated'>) {
  const total = snapshot.exportSuccessCount + snapshot.exportFailureCount
  const averageExportTimeMs =
    snapshot.exportSuccessCount > 0
      ? Math.round(snapshot.totalDurationMs / snapshot.exportSuccessCount)
      : 0
  return {
    ...snapshot,
    averageExportTimeMs,
    exportSuccessRate: total > 0 ? snapshot.exportSuccessCount / total : 0,
    exportFailureRate: total > 0 ? snapshot.exportFailureCount / total : 0,
    lastUpdated: new Date().toISOString(),
  }
}

function loadMetrics(): ExportMetricsSnapshot {
  try {
    const raw = fs.readFileSync(METRICS_FILE, 'utf8')
    const parsed = JSON.parse(raw) as ExportMetricsSnapshot
    memory = parsed
    return parsed
  } catch {
    return memory
  }
}

function persistMetrics(snapshot: ExportMetricsSnapshot): void {
  memory = snapshot
  try {
    fs.writeFileSync(METRICS_FILE, JSON.stringify(snapshot), 'utf8')
  } catch {
    /* best-effort */
  }
}

export function recordExportMetricSuccess(durationMs: number): ExportMetricsSnapshot {
  const current = loadMetrics()
  const next = recompute({
    exportSuccessCount: current.exportSuccessCount + 1,
    exportFailureCount: current.exportFailureCount,
    totalDurationMs: current.totalDurationMs + Math.max(0, durationMs),
  })
  persistMetrics(next)
  if (process.env.NODE_ENV !== 'production') {
    console.info('[export] metrics success', { durationMs, rate: next.exportSuccessRate })
  }
  return next
}

export function recordExportMetricFailure(): ExportMetricsSnapshot {
  const current = loadMetrics()
  const next = recompute({
    exportSuccessCount: current.exportSuccessCount,
    exportFailureCount: current.exportFailureCount + 1,
    totalDurationMs: current.totalDurationMs,
  })
  persistMetrics(next)
  if (process.env.NODE_ENV !== 'production') {
    console.info('[export] metrics failure', { rate: next.exportFailureRate })
  }
  return next
}

export function getExportMetrics(): ExportMetricsSnapshot {
  return loadMetrics()
}
