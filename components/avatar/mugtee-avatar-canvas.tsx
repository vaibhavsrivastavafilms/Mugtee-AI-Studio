'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { cn } from '@/lib/utils'
import { prefersReducedMotion } from '@/lib/webgl/capabilities'
import type { MugteeAvatarState } from '@/components/avatar/types'
import {
  MUGTEE_GLB_PATH,
  MugteeGlbModel,
  preloadMugteeGlb,
} from '@/components/avatar/mugtee-glb-model'
import { MugteeProceduralModel } from '@/components/avatar/mugtee-procedural-model'
import { AvatarCanvasSkeleton } from '@/components/avatar/avatar-canvas-skeleton'

export { AvatarCanvasSkeleton } from '@/components/avatar/avatar-canvas-skeleton'

const MUGTEE_GLB_ENABLED =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_MUGTEE_GLB === '1'

export function MugteeAvatarCanvas({
  state = 'idle',
  animated = true,
  className,
  useGlb,
  onError,
}: {
  state?: MugteeAvatarState
  animated?: boolean
  className?: string
  /** When false, skips GLB probe (default). Set true only with NEXT_PUBLIC_MUGTEE_GLB=1. */
  useGlb?: boolean
  onError?: () => void
}) {
  const [failed, setFailed] = useState(false)
  const [glbAvailable, setGlbAvailable] = useState<boolean>(
    () => useGlb === true && MUGTEE_GLB_ENABLED
  )
  const [motionOk, setMotionOk] = useState(false)
  const [tabVisible, setTabVisible] = useState(true)
  const contextCleanupRef = useRef<(() => void) | null>(null)
  const wantGlb = useGlb === true && MUGTEE_GLB_ENABLED

  useEffect(() => {
    setMotionOk(animated && !prefersReducedMotion())
  }, [animated])

  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden)
    onVis()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    return () => {
      contextCleanupRef.current?.()
      contextCleanupRef.current = null
    }
  }, [])

  const handleError = useCallback(() => {
    setFailed(true)
    onError?.()
  }, [onError])

  useEffect(() => {
    if (!wantGlb) {
      setGlbAvailable(false)
      return
    }
    let cancelled = false
    fetch(MUGTEE_GLB_PATH, { method: 'HEAD' })
      .then((res) => {
        if (!cancelled) {
          const ok = res.ok
          setGlbAvailable(ok)
          if (ok) preloadMugteeGlb()
        }
      })
      .catch(() => {
        if (!cancelled) setGlbAvailable(false)
      })
    return () => {
      cancelled = true
    }
  }, [wantGlb])

  if (failed) return null

  const preferGlb = wantGlb && glbAvailable

  return (
    <div className={cn('relative h-full w-full touch-none', className)}>
      <Suspense fallback={<AvatarCanvasSkeleton />}>
        <Canvas
          frameloop={tabVisible && motionOk ? 'always' : 'demand'}
          dpr={[1, 1.25]}
          gl={{
            alpha: true,
            antialias: false,
            powerPreference: 'low-power',
            failIfMajorPerformanceCaveat: true,
            preserveDrawingBuffer: false,
          }}
          camera={{ position: [0, 0.15, 2.1], fov: 38 }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0)
            const canvas = gl.domElement
            const onLost = (event: Event) => {
              event.preventDefault()
              handleError()
            }
            canvas.addEventListener('webglcontextlost', onLost)
            contextCleanupRef.current = () => {
              canvas.removeEventListener('webglcontextlost', onLost)
              try {
                gl.dispose()
              } catch {
                /* already lost */
              }
            }
          }}
          style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        >
            <ambientLight intensity={0.35} />
            <directionalLight position={[2, 3, 4]} intensity={0.9} color="#ffe8b0" />
            <directionalLight position={[-2, 1, -1]} intensity={0.25} color="#d4af37" />
            <pointLight position={[0, 0.3, 1.2]} intensity={0.6} color="#f5c44d" distance={4} />
            {preferGlb ? (
              <MugteeGlbModel state={state} animated={motionOk} preferGlb />
            ) : (
              <MugteeProceduralModel state={state} animated={motionOk} />
            )}
        </Canvas>
      </Suspense>
    </div>
  )
}
