'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { useCinematicMotionInitial } from '@/components/home/cinematic-home-motion'
import { glassPanel, goldButton } from '@/components/home/cinematic-home-styles'
import { cn } from '@/lib/utils'

type LandingProductCardProps = {
  icon: LucideIcon
  title: string
  description: string
  detail: string
  ctaLabel: string
  href: string
  onClick?: (e: React.MouseEvent) => void
  className?: string
}

export function LandingProductCard({
  icon: Icon,
  title,
  description,
  detail,
  ctaLabel,
  href,
  onClick,
  className,
}: LandingProductCardProps) {
  const initial = useCinematicMotionInitial({ opacity: 0, y: 12 })

  return (
    <motion.article
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        glassPanel,
        'group flex flex-col p-5 sm:p-6 transition-shadow duration-300',
        'hover:shadow-[0_0_40px_rgba(212,175,55,0.12)]',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/12">
        <Icon className="h-5 w-5 text-[#D4AF37]" aria-hidden />
      </div>

      <h2 className="mt-4 text-[11px] font-semibold tracking-[0.22em] uppercase text-[#D4AF37]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-white/80 leading-snug">{description}</p>
      <p className="mt-2 text-[12px] text-white/45 leading-relaxed">{detail}</p>

      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(goldButton, 'mt-auto pt-6 w-full py-2.5 text-[10px]')}
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : (
        <Link
          href={href}
          className={cn(goldButton, 'mt-auto pt-6 w-full py-2.5 text-[10px]')}
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </motion.article>
  )
}
