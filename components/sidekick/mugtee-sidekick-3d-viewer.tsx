'use client'

import { Suspense, useCallback, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { cn } from '@/lib/utils'
import { MugteeSidekick3DModel } from '@/components/sidekick/mugtee-sidekick-3d-model'
import { SidekickAvatarSkeleton } from '@/components/sidekick/sidekick-avatar-skeleton'

export { SidekickAvatarSkeleton } from '@/components/sidekick/sidekick-avatar-skeleton'

export function MugteeSidekick3DViewer({
  animated = true,
  className,
  onError,
}: {
  animated?: boolean
  className?: string
  onError?: () => void
}) {
  const [failed, setFailed] = useState(false)

  const handleError = useCallback(() => {
    setFailed(true)
    onError?.()
  }, [onError])

  if (failed) return null

  return (
    <div className={cn('relative z-10 h-full w-full touch-none', className)}>
      <Suspense fallback={<SidekickAvatarSkeleton />}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'low-power',
            failIfMajorPerformanceCaveat: false,
          }}
          camera={{ position: [0, 0.15, 2.1], fov: 38 }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0)
            gl.domElement.addEventListener('webglcontextlost', (event) => {
              event.preventDefault()
              handleError()
            })
          }}
          style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <ambientLight intensity={0.35} />
          <directionalLight position={[2, 3, 4]} intensity={0.9} color="#ffe8b0" />
          <directionalLight position={[-2, 1, -1]} intensity={0.25} color="#d4af37" />
          <pointLight position={[0, 0.3, 1.2]} intensity={0.6} color="#f5c44d" distance={4} />
          <MugteeSidekick3DModel animated={animated} />
        </Canvas>
      </Suspense>
    </div>
  )
}
