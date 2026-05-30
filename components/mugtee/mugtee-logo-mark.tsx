import Image from 'next/image'
import { cn } from '@/lib/utils'

export const MUGTEE_LOGO_SRC = '/logo.png'

export function MugteeLogoMark({
  size = 36,
  className,
  priority = false,
}: {
  size?: number
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src={MUGTEE_LOGO_SRC}
      alt="Mugtee"
      width={size}
      height={size}
      priority={priority}
      className={cn('object-contain shrink-0', className)}
    />
  )
}
