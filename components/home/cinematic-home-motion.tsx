'use client'

import type { MotionProps } from 'framer-motion'
import { useMounted } from '@/lib/hooks/use-mounted'

/** Framer `initial` only after mount so SSR and hydration see the same DOM. */
export function useCinematicMotionInitial(
  initial: MotionProps['initial']
): MotionProps['initial'] {
  const mounted = useMounted()
  return mounted ? initial : false
}
