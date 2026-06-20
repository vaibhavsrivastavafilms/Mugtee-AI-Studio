'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export const MUGTEE_SIDEKICK_SRC = '/mugtee/mugtee-sidekick.png'

const SIZE_PX = { sm: 40, md: 56, lg: 72 } as const

export type MugteeSidekickAvatarSize = keyof typeof SIZE_PX

function SidekickAvatarFallback({
  px,
  priority,
  animated,
}: {
  px: number
  priority: boolean
  animated: boolean
}) {
  return (
    <Image
      src={MUGTEE_SIDEKICK_SRC}
      alt="Mugtee sidekick"
      width={px}
      height={px}
      priority={priority}
      className={cn(
        'relative z-10 h-auto w-full object-contain',
        'drop-shadow-[0_6px_28px_rgba(245,196,77,0.32)]',
        animated && 'animate-orb-breathe'
      )}
    />
  )
}

export function MugteeSidekickAvatar({
  size = 'md',
  animated = true,
  className,
  priority = false,
}: {
  size?: MugteeSidekickAvatarSize
  animated?: boolean
  className?: string
  priority?: boolean
}) {
  const px = SIZE_PX[size]

  const avatarContent = (
    <>
      <span
        aria-hidden
        className={cn(
          'orb-halo absolute inset-[-20%] rounded-full blur-2xl pointer-events-none',
          animated ? 'opacity-55' : 'opacity-40'
        )}
      />
      {animated ? (
        <span
          aria-hidden
          className="absolute left-1/2 top-[20%] z-[1] h-[18%] w-[38%] -translate-x-1/2 rounded-full bg-amber-300/50 blur-md animate-pulse pointer-events-none"
        />
      ) : null}
      <SidekickAvatarFallback px={px} priority={priority} animated={animated} />
    </>
  )

  const baseClass = cn(
    'relative inline-flex shrink-0 items-center justify-center select-none overflow-hidden',
    className
  )

  if (!animated) {
    return (
      <div
        className={cn(baseClass, 'group transition-transform duration-300 hover:scale-105')}
        style={{ width: px, height: px }}
        role="img"
        aria-label="Mugtee sidekick"
      >
        {avatarContent}
      </div>
    )
  }

  return (
    <motion.div
      className={baseClass}
      style={{ width: px, height: px }}
      role="img"
      aria-label="Mugtee sidekick"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={{ scale: 1.06 }}
    >
      {avatarContent}
    </motion.div>
  )
}

export function sidekickAvatarSizeFromPx(px: number): MugteeSidekickAvatarSize {
  if (px <= 36) return 'sm'
  if (px <= 52) return 'md'
  return 'lg'
}
