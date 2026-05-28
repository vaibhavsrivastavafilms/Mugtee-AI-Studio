'use client'

import type { ExportPackageSnapshot } from '@/lib/cinematic/export-package'

export function ExportPackagePanel({ snapshot }: { snapshot: ExportPackageSnapshot }) {
  return (
    <section className="rounded-[28px] border border-[#D4AF37]/15 bg-gradient-to-br from-white/[0.04] to-black/20 p-5 sm:p-6 shadow-[0_0_50px_rgba(212,175,55,0.05)]">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/85">
            Film World
          </p>
          <p className="text-sm text-white/45 mt-1">
            Hook, captions, and rhythm aligned for the world
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] text-[9px] tracking-wider uppercase text-emerald-200/90">
          Publish ready
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PackageField label="Hook" value={snapshot.hook} emphasis />
        <PackageField label="CTA" value={snapshot.cta} />
        <PackageField label="Captions" value={snapshot.captionPrimary} />
        <PackageField
          label="Hashtags"
          value={snapshot.hashtags.join(' ')}
          mono
        />
        <PackageField label="Voice style" value={snapshot.voiceStyle} />
        <PackageField label="Story mood" value={snapshot.storyMood} />
      </div>
    </section>
  )
}

function PackageField({
  label,
  value,
  emphasis,
  mono,
}: {
  label: string
  value: string
  emphasis?: boolean
  mono?: boolean
}) {
  if (!value) return null

  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
      <p className="text-[9px] tracking-[0.22em] uppercase text-white/40 mb-1.5">
        {label}
      </p>
      <p
        className={
          emphasis
            ? 'font-display text-[15px] leading-snug text-[#F4E7C1] italic'
            : mono
              ? 'text-xs text-[#C8A24E]/80 tracking-wide'
              : 'text-sm text-white/70 leading-relaxed'
        }
      >
        {value}
      </p>
    </div>
  )
}
