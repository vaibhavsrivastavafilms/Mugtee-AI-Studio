'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { shouldPrefer2DFallback } from '@/lib/webgl/capabilities'
import type { MugteeAvatarSize, MugteeAvatarState } from '@/components/avatar/types'
import { MUGTEE_AVATAR_SIZE_PX } from '@/components/avatar/types'
import { AvatarCanvasSkeleton } from '@/components/avatar/mugtee-avatar-canvas'
import { MUGTEE_SIDEKICK_SRC } from '@/components/sidekick/mugtee-sidekick-avatar'

const MugteeAvatarCanvas = dynamic(
  () =>
    import('@/components/avatar/mugtee-avatar-canvas').then((m) => m.MugteeAvatarCanvas),
  { ssr: false, loading: () => <AvatarCanvasSkeleton /> }
)

function Avatar2DFallback({
  px,
  priority,
  animated,
  state,
}: {
  px: number
  priority: boolean
  animated: boolean
  state: MugteeAvatarState
}) {
  const glow =
    state === 'celebrating' || state === 'happy'
      ? 'drop-shadow-[0_8px_40px_rgba(245,196,77,0.55)]'
      : state === 'warning'
        ? 'drop-shadow-[0_8px_32px_rgba(255,159,67,0.45)]'
        : 'drop-shadow-[0_6px_28px_rgba(245,196,77,0.32)]'

  return (
    <Image
      src={MUGTEE_SIDEKICK_SRC}
      alt="Mugtee companion"
      width={px}
      height={px}
      priority={priority}
      className={cn(
        'relative z-10 h-auto w-full object-contain',
        glow,
        animated && 'animate-orb-breathe'
      )}
    />
  )
}

export type MugteeAvatarProps = {
  state?: MugteeAvatarState
  size?: MugteeAvatarSize
  animated?: boolean
  className?: string
  priority?: boolean
}

export function MugteeAvatar({
  state = 'idle',
  size = 'md',
  animated = true,
  className,
  priority = false,
}: MugteeAvatarProps) {
  const px = MUGTEE_AVATAR_SIZE_PX[size]
  const [use2D, setUse2D] = useState<boolean | null>(null)

  useEffect(() => {
    setUse2D(shouldPrefer2DFallback())
  }, [])

  const show3D = use2D === false

  const avatarContent = (
    <>
      <span
        aria-hidden
        className={cn(
          'orb-halo absolute inset-[-20%] rounded-full blur-2xl pointer-events-none',
          animated ? 'opacity-55' : 'opacity-40',
          state === 'celebrating' && 'opacity-75',
          state === 'warning' && 'from-amber-500/30'
        )}
      />
      {animated && (state === 'listening' || state === 'speaking') ? (
        <span
          aria-hidden
          className="absolute left-1/2 top-[20%] z-[1] h-[18%] w-[38%] -translate-x-1/2 rounded-full bg-amber-300/50 blur-md animate-pulse pointer-events-none"
        />
      ) : null}
      {use2D === null ? (
        <AvatarCanvasSkeleton />
      ) : show3D ? (
        <MugteeAvatarCanvas
          state={state}
          animated={animated}
          onError={() => setUse2D(true)}
        />
      ) : (
        <Avatar2DFallback px={px} priority={priority} animated={animated} state={state} />
      )}
    </>
  )

  const baseClass = cn(
    'relative inline-flex shrink-0 items-center justify-center select-none overflow-visible',
    className
  )

  const dimStyle = { width: px, height: px }

  if (!animated) {
    return (
      <div
        className={cn(baseClass, 'group transition-transform duration-300 hover:scale-105')}
        style={dimStyle}
        role="img"
        aria-label={`Mugtee companion — ${state}`}
      >
        {avatarContent}
      </div>
    )
  }

  const motionProps =
    state === 'celebrating'
      ? { animate: { y: [0, -12, 0], scale: [1, 1.04, 1] }, transition: { duration: 1.2, repeat: Infinity } }
      : state === 'happy'
        ? { animate: { y: [0, -8, 0] }, transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const } }
        : { animate: { y: [0, -5, 0] }, transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' as const } }

  return (
    <motion.div
      className={baseClass}
      style={dimStyle}
      role="img"
      aria-label={`Mugtee companion — ${state}`}
      {...motionProps}
      whileHover={{ scale: 1.04 }}
    >
      {avatarContent}
    </motion.div>
  )
}

export { type MugteeAvatarState } from '@/components/avatar/types'
