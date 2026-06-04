'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { detectExportCapabilities } from '@/lib/export/export-capabilities'

type RuntimeSnapshot = {
  sharedArrayBuffer: boolean
  crossOriginIsolated: boolean
  coop: string
  coep: string
  webCodecs: boolean
  ffmpegWasm: boolean
  threadedFfmpeg: boolean
  userAgent: string
}

function readIsolationHeaders(): { coop: string; coep: string } {
  if (typeof document === 'undefined') return { coop: 'n/a', coep: 'n/a' }
  // Document cannot read response headers; surface what the page can observe.
  return {
    coop: window.crossOriginIsolated ? 'isolated (COOP+COEP active)' : 'not isolated',
    coep: window.crossOriginIsolated ? 'credentialless or require-corp' : 'none / relaxed',
  }
}

export default function DebugRuntimePage() {
  const [snap, setSnap] = useState<RuntimeSnapshot | null>(null)

  useEffect(() => {
    const caps = detectExportCapabilities()
    const headers = readIsolationHeaders()
    setSnap({
      sharedArrayBuffer: caps.hasSharedArrayBuffer,
      crossOriginIsolated: caps.crossOriginIsolated,
      coop: headers.coop,
      coep: headers.coep,
      webCodecs: caps.canUseWebCodecs,
      ffmpegWasm: caps.canUseFFmpeg,
      threadedFfmpeg: caps.canUseThreadedFFmpeg,
      userAgent: navigator.userAgent,
    })
  }, [])

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#D4AF37]/70">Runtime diagnostic</p>
        <h1 className="mt-2 font-display text-2xl">Browser export runtime</h1>
        <p className="mt-2 text-sm text-white/50">
          Read-only checks for SharedArrayBuffer, cross-origin isolation, WebCodecs, and FFmpeg.wasm.
          Open from a studio route for accurate COOP/COEP.
        </p>

        {!snap ? (
          <div className="mt-8 h-32 shimmer-cinematic rounded-2xl border border-white/[0.06]" />
        ) : (
          <dl className="mt-8 space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-sm">
            {(
              [
                ['SharedArrayBuffer', String(snap.sharedArrayBuffer)],
                ['crossOriginIsolated', String(snap.crossOriginIsolated)],
                ['COOP (observed)', snap.coop],
                ['COEP (observed)', snap.coep],
                ['WebCodecs', String(snap.webCodecs)],
                ['FFmpeg.wasm', String(snap.ffmpegWasm)],
                ['Threaded FFmpeg', String(snap.threadedFfmpeg)],
                ['User agent', snap.userAgent],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="grid gap-1 sm:grid-cols-[180px_1fr]">
                <dt className="text-[10px] uppercase tracking-[0.12em] text-white/45">{key}</dt>
                <dd className="break-all text-white/80">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <Link
          href="/studio/quick"
          className="mt-8 inline-flex min-h-[44px] items-center rounded-xl border border-[#D4AF37]/40 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D4AF37]"
        >
          Open studio
        </Link>
      </div>
    </main>
  )
}
