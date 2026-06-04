'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Cpu, Download, Loader2, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBrowserExport } from '@/lib/export/use-browser-export.client'
import type { ReelTimeline } from '@/lib/reel/types'

type BrowserExportPreflightProps = {
  timeline: ReelTimeline | null
  projectId?: string | null
  filenameBase?: string
  className?: string
}

const phaseLabels: Record<string, string> = {
  idle: 'Ready',
  preparing: 'Preparing',
  rendering: 'Rendering',
  encoding: 'Encoding',
  muxing: 'Muxing',
  finalizing: 'Finalizing',
  complete: 'Complete',
  failed: 'Failed',
}

export function BrowserExportPreflight({
  timeline,
  projectId,
  filenameBase,
  className,
}: BrowserExportPreflightProps) {
  const {
    capabilities,
    settings,
    phase,
    progress,
    message,
    error,
    running,
    blocked,
    canStart,
    runExport,
  } = useBrowserExport({ timeline, projectId, filenameBase })

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const durationSec = timeline?.totalDurationSec ?? 0
  const clipCount = timeline?.clips?.length ?? 0

  const strategyLabel = useMemo(() => {
    switch (capabilities.recommendedStrategy) {
      case 'webcodecs-ffmpeg-mux':
        return 'WebCodecs + FFmpeg mux'
      case 'ffmpeg-transcode':
        return 'FFmpeg encode'
      case 'mediarecorder-fallback':
        return 'MediaRecorder'
      default:
        return 'Unavailable'
    }
  }, [capabilities.recommendedStrategy])

  useEffect(() => {
    if (!mounted) return
    const sab = typeof SharedArrayBuffer
    console.info('[Mugtee browser export diagnostics]', {
      crossOriginIsolated: capabilities.crossOriginIsolated,
      sharedArrayBuffer: sab,
      canUseThreadedFFmpeg: capabilities.canUseThreadedFFmpeg,
      recommendedStrategy: capabilities.recommendedStrategy,
      hardwareConcurrency: capabilities.hardwareConcurrency,
    })
  }, [mounted, capabilities])

  const capabilityDetails = mounted ? (
    <>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-luxe/70">
        <dt>Resolution</dt>
        <dd className="text-right text-luxe/90">
          {settings ? `${settings.width}×${settings.height}` : '—'}
        </dd>
        <dt>Duration</dt>
        <dd className="text-right text-luxe/90">{durationSec ? `${durationSec.toFixed(1)}s` : '—'}</dd>
        <dt>FPS</dt>
        <dd className="text-right text-luxe/90">{settings?.fps ?? '—'}</dd>
        <dt>Clips</dt>
        <dd className="text-right text-luxe/90">{clipCount || '—'}</dd>
        <dt>Strategy</dt>
        <dd className="text-right text-luxe/90">{strategyLabel}</dd>
      </dl>

      <div className="flex flex-wrap gap-2 text-[10px] text-luxe/55">
        <span className="inline-flex items-center gap-1">
          <Cpu className="w-3 h-3" aria-hidden />
          {capabilities.hardwareConcurrency} cores
        </span>
        {capabilities.deviceMemoryGb != null ? (
          <span>{capabilities.deviceMemoryGb} GB RAM</span>
        ) : null}
        <span>{capabilities.crossOriginIsolated ? 'COI' : 'single-thread'}</span>
      </div>

      <p
        className="text-[9px] font-mono text-luxe/35 leading-relaxed"
        data-testid="browser-export-diagnostics"
      >
        coi={String(capabilities.crossOriginIsolated)} · sab={typeof SharedArrayBuffer} · threaded=
        {String(capabilities.canUseThreadedFFmpeg)}
      </p>
    </>
  ) : (
    <p className="text-[11px] text-luxe/50">Loading export diagnostics…</p>
  )

  return (
    <div
      className={cn(
        'rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-3',
        className
      )}
      data-testid="browser-export-preflight"
    >
      <div className="flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-gold-300/80">
        <Monitor className="w-3 h-3 shrink-0" aria-hidden />
        Browser export (local)
      </div>

      {capabilityDetails}

      {capabilities.warnings.length > 0 ? (
        <ul className="space-y-1 text-[11px] text-amber-200/75" role="status">
          {capabilities.warnings.map((w) => (
            <li key={w} className="flex gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      ) : null}

      {capabilities.blockers.length > 0 ? (
        <p className="text-[11px] text-red-300/90" role="alert">
          {capabilities.blockers.join(' ')}
        </p>
      ) : null}

      {running ? (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-luxe/60 uppercase tracking-wider">
            <span>{phaseLabels[phase] ?? phase}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gold-400/80 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
            />
          </div>
          {message ? <p className="text-[11px] text-luxe/50">{message}</p> : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-[11px] text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canStart || blocked}
        onClick={() => void runExport()}
        className={cn(
          'inline-flex w-full min-h-[40px] items-center justify-center gap-1.5 rounded-xl px-4 py-2',
          'text-[10px] font-semibold tracking-[0.12em] uppercase transition-opacity',
          'bg-gold-500/15 border border-gold-500/35 text-gold-100 hover:bg-gold-500/20',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {running ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
        ) : (
          <Download className="w-3.5 h-3.5" aria-hidden />
        )}
        {running
          ? 'Exporting in browser…'
          : blocked
            ? 'Browser rendering unavailable'
            : 'Advanced: Export MP4 in browser'}
      </button>

      <p className="text-[10px] text-luxe/40 leading-relaxed">
        Optional advanced path (WebCodecs + FFmpeg.wasm). Creator Pack export is recommended for production.
      </p>
    </div>
  )
}
