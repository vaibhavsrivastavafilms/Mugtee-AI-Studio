'use client'

import Image, { type ImageProps } from 'next/image'
import { shouldUnoptimizeImageSrc } from '@/lib/image/ephemeral-image-url'

type RemoteImageProps = Omit<ImageProps, 'unoptimized'> & {
  unoptimized?: boolean
}

/**
 * Use for user-generated / remote storyboard URLs (pollinations, signed storage, etc.).
 * Bypasses `/_next/image` when the proxy URL would exceed Next.js limits.
 */
export function RemoteImage({ src, unoptimized, ...props }: RemoteImageProps) {
  const srcStr = typeof src === 'string' ? src : undefined
  return (
    <Image
      src={src}
      unoptimized={unoptimized ?? shouldUnoptimizeImageSrc(srcStr)}
      {...props}
    />
  )
}
