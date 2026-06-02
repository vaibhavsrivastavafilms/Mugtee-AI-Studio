'use client'

import { Suspense, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { Group } from 'three'
import type { MugteeAvatarState } from '@/components/avatar/types'
import {
  AVATAR_ANIMATION_BY_STATE,
  lerpAnimationParams,
} from '@/components/avatar/avatar-animations'
import { MugteeProceduralModel } from '@/components/avatar/mugtee-procedural-model'

export const MUGTEE_GLB_PATH = '/models/mugtee.glb'

function GlbScene({
  state,
  animated,
}: {
  state: MugteeAvatarState
  animated: boolean
}) {
  const root = useRef<Group>(null)
  const { scene } = useGLTF(MUGTEE_GLB_PATH)
  const params = AVATAR_ANIMATION_BY_STATE[state]

  useFrame((frameState) => {
    if (!root.current || !animated) return
    const t = frameState.clock.elapsedTime
    const breathe = 1 + Math.sin(t * params.breatheSpeed) * params.breatheAmp
    root.current.rotation.y = Math.sin(t * params.headSwaySpeed) * params.headSway
    root.current.scale.setScalar(breathe * 1.2)
  })

  return (
    <group ref={root} position={[0, -0.35, 0]}>
      <primitive object={scene.clone()} />
    </group>
  )
}

function GlbWithErrorBoundary({
  state,
  animated,
  onError,
}: {
  state: MugteeAvatarState
  animated: boolean
  onError: () => void
}) {
  try {
    return (
      <Suspense fallback={<MugteeProceduralModel state={state} animated={animated} />}>
        <GlbScene state={state} animated={animated} />
      </Suspense>
    )
  } catch {
    onError()
    return <MugteeProceduralModel state={state} animated={animated} />
  }
}

/** Attempt GLB load; procedural mascot is always the safe fallback. */
export function MugteeGlbModel({
  state = 'idle',
  animated = true,
  preferGlb = false,
}: {
  state?: MugteeAvatarState
  animated?: boolean
  /** When true, tries /models/mugtee.glb first (HEAD check done by parent). */
  preferGlb?: boolean
}) {
  if (!preferGlb) {
    return <MugteeProceduralModel state={state} animated={animated} />
  }

  return (
    <GlbWithErrorBoundary
      state={state}
      animated={animated}
      onError={() => null}
    />
  )
}

export function preloadMugteeGlb(): void {
  try {
    useGLTF.preload(MUGTEE_GLB_PATH)
  } catch {
    /* optional asset */
  }
}
