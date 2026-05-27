'use client'

import { useMemo } from 'react'
import {
  getAuthorshipIdentityLine,
  getEmotionalOwnershipLine,
  getCinematicSignatureLine,
  getVisualStorytellingConfidenceLine,
  getAuthoredContinuityLine,
  getSignatureMemoryLine,
  getAuthorshipContinuityLine,
} from '@/lib/creator/authorship-immersion-copy'
import { cn } from '@/lib/utils'

export function AuthorshipIdentityAnchor({
  sceneIndex,
  style,
  niche,
  seed = 0,
  className,
}: {
  sceneIndex: number
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getAuthorshipIdentityLine(sceneIndex, style, niche, seed),
    [sceneIndex, style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/48 authorship-identity-glow',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function EmotionalOwnershipPresence({
  style,
  niche,
  seed = 0,
  className,
}: {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getEmotionalOwnershipLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/30 emotional-ownership-presence hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function CinematicSignatureAtmosphere({
  style,
  niche,
  seed = 0,
  className,
}: {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getCinematicSignatureLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/28 cinematic-signature-opacity hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function VisualStorytellingConfidence({
  style,
  niche,
  seed = 0,
  className,
}: {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getVisualStorytellingConfidenceLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/36 hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function AuthoredContinuityThread({
  sceneIndex,
  totalScenes,
  style,
  seed = 0,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  style?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getAuthoredContinuityLine(sceneIndex, totalScenes, style, seed),
    [sceneIndex, totalScenes, style, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/26 authored-continuity-breathing hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function SignatureMemoryEcho({
  style,
  niche,
  seed = 0,
  className,
}: {
  style?: string | null
  niche?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getSignatureMemoryLine(style, niche, seed),
    [style, niche, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/24 cinematic-signature-opacity hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}

export function AuthorshipContinuityPresence({
  sceneIndex,
  totalScenes,
  seed = 0,
  className,
}: {
  sceneIndex: number
  totalScenes: number
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getAuthorshipContinuityLine(sceneIndex, totalScenes, seed),
    [sceneIndex, totalScenes, seed]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/34 authorship-identity-glow hidden sm:block',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
