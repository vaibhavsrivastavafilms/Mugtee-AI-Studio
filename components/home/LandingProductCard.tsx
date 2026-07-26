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
        'group flex min-h-[20rem] flex-col p-6 sm:p-7',
        'hover:shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_40px_rgba(212,175,55,0.08)]',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(212,175,55,0.22)] bg-[#141414]">
        <Icon className="h-5 w-5 text-[#D4AF37]" aria-hidden />
      </div>

      <h2 className="mt-5 font-display text-3xl leading-tight text-white">{title}</h2>
      <p className="mt-3 text-base font-medium text-[#B8B8B8] leading-snug">{description}</p>
      <p className="mt-3 text-sm text-[#888888] leading-7">{detail}</p>

      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(goldButton, 'mt-auto w-full px-5 py-3 text-[10px]')}
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : (
        <Link href={href} className={cn(goldButton, 'mt-auto w-full px-5 py-3 text-[10px]')}>
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </motion.article>
  )
}
