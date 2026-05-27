'use client'

import { CheckCircle2 } from 'lucide-react'
import {
  CONFIDENCE_SIGNALS,
  type ExportPackageSnapshot,
} from '@/lib/cinematic/export-package'

export function ExportDetailsPanel({ snapshot }: { snapshot: ExportPackageSnapshot }) {
  return (
    <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/85">
          Export Details
        </p>
        <p className="text-sm text-white/45 mt-1">Platform-ready cinematic package</p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <Detail label="Duration" value={`${snapshot.duration}s`} />
        <Detail label="Scenes" value={String(snapshot.sceneCount)} />
        <Detail label="Format" value="9:16 vertical" />
        <Detail label="Niche" value={snapshot.nicheLabel} />
        <Detail label="Visual" value={snapshot.visualStyle} />
        <Detail label="Voice" value={snapshot.voiceStyle} />
        <Detail label="Rhythm" value={snapshot.filmRhythm} />
      </dl>

      <PublishReadyStatus snapshot={snapshot} />
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-black/15 px-3 py-2.5">
      <dt className="text-[9px] tracking-wider uppercase text-white/40">{label}</dt>
      <dd className="text-sm text-[#F4E7C1] mt-0.5 truncate">{value}</dd>
    </div>
  )
}

function PublishReadyStatus({ snapshot }: { snapshot: ExportPackageSnapshot }) {
  const checks = [
    { label: 'Story arc locked', ok: snapshot.sceneCount > 0 },
    { label: 'Captions packaged', ok: Boolean(snapshot.captionPrimary) },
    { label: 'Storyboards aligned', ok: snapshot.hasStoryboards },
    { label: 'Voice direction set', ok: Boolean(snapshot.voiceStyle) },
  ]

  return (
    <div className="pt-2 space-y-3">
      <p className="text-[10px] tracking-[0.22em] uppercase text-white/40">
        Publish Ready Status
      </p>
      <ul className="space-y-2">
        {checks.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs text-white/65">
            <CheckCircle2
              className={`w-3.5 h-3.5 shrink-0 ${
                item.ok ? 'text-emerald-400/80' : 'text-white/20'
              }`}
            />
            {item.label}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 pt-1">
        {CONFIDENCE_SIGNALS.map((signal) => (
          <span
            key={signal}
            className="px-2 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-[9px] tracking-wider uppercase text-white/45"
          >
            {signal}
          </span>
        ))}
      </div>
    </div>
  )
}
