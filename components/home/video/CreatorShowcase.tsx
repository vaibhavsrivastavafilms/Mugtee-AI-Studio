'use client'

import Image from 'next/image'
import { BRAND_LOGOS, TESTIMONIALS } from '@/lib/home/landing-demos'
import { cn } from '@/lib/utils'

type CreatorShowcaseProps = {
  className?: string
}

/** Short quotes, faces, and brand marks — no long paragraphs. */
export function CreatorShowcase({ className }: CreatorShowcaseProps) {
  return (
    <div className={cn('space-y-10', className)}>
      <ul className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((item) => (
          <li
            key={item.id}
            className="mugtee-world-card rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#191919]/90 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-full border border-[rgba(212,175,55,0.25)]">
                <Image
                  src={item.avatar}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#888888]">
                  {item.role}
                </p>
              </div>
            </div>
            <p className="mt-4 font-display text-xl leading-snug text-[#EDEDED]">
              “{item.quote}”
            </p>
          </li>
        ))}
      </ul>

      <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {BRAND_LOGOS.map((brand) => (
          <li
            key={brand}
            className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#888888]"
          >
            {brand}
          </li>
        ))}
      </ul>
    </div>
  )
}
