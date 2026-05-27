'use client'

import type { ExportPlatformCard } from '@/lib/cinematic/export-package'

export function PlatformExportCards({ cards }: { cards: ExportPlatformCard[] }) {
  return (
    <section className="space-y-3">
      <p className="text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/85">
        Platform Formats
      </p>
      <div className="flex gap-3 overflow-x-auto scroll-touch scrollbar-luxe pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {cards.map((card) => (
          <article
            key={card.id}
            className="snap-start shrink-0 w-[78vw] sm:w-[240px] rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 hover:border-[#D4AF37]/25 transition"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-medium text-[#F4E7C1]">{card.name}</h3>
              <span className="text-[9px] tracking-wider uppercase text-white/40">
                {card.aspectRatio}
              </span>
            </div>
            <dl className="space-y-2 text-[11px]">
              <Row label="Duration" value={card.durationLabel} />
              <Row label="Visual" value={card.visualStyle} />
              <Row label="Voice" value={card.voiceStyle} />
            </dl>
            <p className="mt-3 pt-3 border-t border-white/[0.06] text-[11px] text-white/55 italic line-clamp-2 leading-relaxed">
              {card.captionPreview}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-white/40 uppercase tracking-wider">{label}</dt>
      <dd className="text-white/70 text-right truncate max-w-[130px]">{value}</dd>
    </div>
  )
}
