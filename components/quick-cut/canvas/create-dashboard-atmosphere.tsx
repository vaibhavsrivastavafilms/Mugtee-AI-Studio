'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { MUGTEE_SIDEKICK_SRC } from '@/components/sidekick/mugtee-sidekick-avatar'
import { cn } from '@/lib/utils'

const SCENE_PANELS = [
  {
    label: 'Scene 1',
    sub: 'Character',
    gradient: 'from-amber-950/50 via-black/40 to-black/70',
    accent: 'border-gold-500/25',
  },
  {
    label: 'Scene 2',
    sub: 'Action',
    gradient: 'from-cyan-950/40 via-black/40 to-black/70',
    accent: 'border-cyan-500/20',
  },
  {
    label: 'Scene 3',
    sub: 'Concept',
    gradient: 'from-gold-900/35 via-black/40 to-black/70',
    accent: 'border-gold-500/20',
  },
] as const

export function CreateDashboardAtmosphere({ className }: { className?: string }) {
  return (
    <div
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}
      aria-hidden
    >
      <div className="absolute inset-0">
        <Image
          src="/mugtee/create-dashboard-bg.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_35%] scale-105 opacity-[0.42] blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/92" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_38%,rgba(212,175,55,0.1)_0%,transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_85%_50%,rgba(80,120,180,0.06)_0%,transparent_55%)]" />
      </div>

      <motion.div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[min(1100px,140vw)] h-[min(900px,90vh)] rounded-full bg-gold-500/[0.06] blur-[140px]"
        animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.05, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-[min(600px,80vw)] h-[min(500px,60vh)] rounded-full bg-amber-900/[0.07] blur-[100px]"
        animate={{ opacity: [0.25, 0.5, 0.25], x: [0, -16, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute right-[14%] xl:right-[22%] top-[28%] hidden md:block w-[min(140px,18vw)] opacity-80"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image
          src={MUGTEE_SIDEKICK_SRC}
          alt=""
          width={160}
          height={160}
          className="w-full h-auto drop-shadow-[0_8px_32px_rgba(245,196,77,0.35)]"
        />
      </motion.div>

      <div className="absolute right-3 xl:right-6 2xl:right-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-2.5 w-[168px] 2xl:w-[200px]">
        {SCENE_PANELS.map((panel, i) => (
          <motion.div
            key={panel.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
            className={cn(
              'relative overflow-hidden rounded-xl border backdrop-blur-md',
              'bg-gradient-to-br shadow-[0_8px_32px_rgba(0,0,0,0.45)]',
              panel.gradient,
              panel.accent
            )}
          >
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-2 right-2 w-8 h-8 border-t border-r border-gold-500/30 rounded-tr-lg" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b border-l border-gold-500/20 rounded-bl-lg" />
            </div>
            <div className="relative px-3 py-4 min-h-[72px] flex flex-col justify-end">
              <span className="text-[9px] tracking-[0.22em] uppercase text-gold-300/70">
                {panel.label}
              </span>
              <span className="font-display text-sm text-[#F4E7C1]/85 mt-0.5">{panel.sub}</span>
              <div className="mt-2 h-8 rounded-md bg-black/35 border border-white/[0.06] flex items-center justify-center">
                <Image
                  src={MUGTEE_SIDEKICK_SRC}
                  alt=""
                  width={28}
                  height={28}
                  className="h-6 w-auto opacity-60 object-contain"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="absolute inset-0 film-grain opacity-[0.28]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-gold-500/[0.04] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/85 to-transparent" />
    </div>
  )
}
