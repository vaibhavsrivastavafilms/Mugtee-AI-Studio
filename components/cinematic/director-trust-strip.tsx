'use client'

import { useEffect, useMemo, useState } from 'react'
import { getDirectorTrustLine } from '@/lib/creator/return-energy'
import { cn } from '@/lib/utils'

export function DirectorTrustStrip({
  visible,
  seed = 0,
}: {
  visible: boolean
  seed?: number
}) {
  const line = useMemo(() => getDirectorTrustLine(seed), [seed])
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (visible) {
      setShown(true)
      return
    }
    const timer = setTimeout(() => setShown(false), 320)
    return () => clearTimeout(timer)
  }, [visible])

  if (!shown && !visible) return null

  return (
    <p
      className={cn(
        'text-center text-[10px] tracking-[0.2em] uppercase text-[#C8A24E]/60 py-2 transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      role="status"
    >
      {line}
    </p>
  )
}
