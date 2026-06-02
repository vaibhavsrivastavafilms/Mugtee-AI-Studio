'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, MeshStandardMaterial } from 'three'
import type { MugteeAvatarState } from '@/components/avatar/types'
import {
  AVATAR_ANIMATION_BY_STATE,
  lerpAnimationParams,
} from '@/components/avatar/avatar-animations'
import {
  MUGTEE_BODY,
  MUGTEE_FACE,
  MUGTEE_GOLD,
  MUGTEE_GOLD_EMISSIVE,
  MUGTEE_HOOD,
  MUGTEE_TRIM,
  MUGTEE_WARNING_EMISSIVE,
} from '@/components/avatar/mugtee-colors'

type MugteeProceduralModelProps = {
  state?: MugteeAvatarState
  animated?: boolean
}

function blinkFactor(t: number): number {
  const cycle = t % 4.2
  if (cycle < 0.12) return Math.max(0.08, 1 - cycle / 0.12)
  if (cycle < 0.18) return Math.max(0.08, (cycle - 0.12) / 0.06)
  return 1
}

export function MugteeProceduralModel({
  state = 'idle',
  animated = true,
}: MugteeProceduralModelProps) {
  const root = useRef<Group>(null)
  const leftEyeMat = useRef<MeshStandardMaterial>(null)
  const rightEyeMat = useRef<MeshStandardMaterial>(null)
  const prevState = useRef(state)
  const blendRef = useRef(1)

  const targetParams = useMemo(() => AVATAR_ANIMATION_BY_STATE[state], [state])

  useFrame((frameState, delta) => {
    if (!root.current) return

    if (prevState.current !== state) {
      blendRef.current = 0
      prevState.current = state
    }
    blendRef.current = Math.min(1, blendRef.current + delta * 3)
    const from = AVATAR_ANIMATION_BY_STATE[prevState.current] ?? targetParams
    const params = lerpAnimationParams(from, targetParams, blendRef.current)

    const t = frameState.clock.elapsedTime
    const blink = animated ? blinkFactor(t) : 1
    const breathe = animated ? 1 + Math.sin(t * params.breatheSpeed) * params.breatheAmp : 1
    const bounce = animated ? Math.sin(t * params.headSwaySpeed * 2) * params.bounce : 0
    const shake =
      animated && params.shake > 0
        ? Math.sin(t * 18) * params.shake
        : 0

    root.current.rotation.y =
      (animated ? Math.sin(t * params.headSwaySpeed) * params.headSway : 0) + shake
    root.current.rotation.z = animated ? params.headTilt * Math.sin(t * 0.4) : 0
    root.current.position.y = bounce
    root.current.position.z = params.leanZ
    root.current.scale.setScalar(breathe)

    const eyeBase = state === 'warning' ? MUGTEE_WARNING_EMISSIVE : MUGTEE_GOLD_EMISSIVE
    const pulse =
      animated && params.eyePulse > 0
        ? 0.5 + 0.5 * Math.sin(t * (2 + params.eyePulse * 3))
        : 1
    const intensity = params.eyeIntensity * pulse * (0.35 + 0.65 * blink)

    if (leftEyeMat.current) {
      leftEyeMat.current.emissiveIntensity = intensity
      leftEyeMat.current.color.set(eyeBase)
      leftEyeMat.current.emissive.set(eyeBase)
    }
    if (rightEyeMat.current) {
      rightEyeMat.current.emissiveIntensity = intensity
      rightEyeMat.current.color.set(eyeBase)
      rightEyeMat.current.emissive.set(eyeBase)
    }
  })

  return (
    <group ref={root} position={[0, -0.15, 0]}>
      <mesh position={[0, -0.55, 0]}>
        <capsuleGeometry args={[0.32, 0.42, 6, 12]} />
        <meshStandardMaterial color={MUGTEE_BODY} roughness={0.85} metalness={0.08} />
      </mesh>

      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.52, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
        <meshStandardMaterial color={MUGTEE_HOOD} roughness={0.78} metalness={0.12} />
      </mesh>

      <mesh position={[0, -0.05, -0.18]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.72, 0.55, 0.22]} />
        <meshStandardMaterial color={MUGTEE_HOOD} roughness={0.82} metalness={0.1} />
      </mesh>

      <mesh position={[-0.28, 0.52, 0.02]} rotation={[0.15, -0.35, -0.45]}>
        <coneGeometry args={[0.14, 0.28, 8]} />
        <meshStandardMaterial color={MUGTEE_HOOD} roughness={0.75} metalness={0.15} />
      </mesh>
      <mesh position={[0.28, 0.52, 0.02]} rotation={[0.15, 0.35, 0.45]}>
        <coneGeometry args={[0.14, 0.28, 8]} />
        <meshStandardMaterial color={MUGTEE_HOOD} roughness={0.75} metalness={0.15} />
      </mesh>

      <mesh position={[-0.28, 0.5, 0.06]} rotation={[0.15, -0.35, -0.45]}>
        <coneGeometry args={[0.07, 0.16, 6]} />
        <meshStandardMaterial
          color={MUGTEE_TRIM}
          emissive={MUGTEE_GOLD}
          emissiveIntensity={0.25}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0.28, 0.5, 0.06]} rotation={[0.15, 0.35, 0.45]}>
        <coneGeometry args={[0.07, 0.16, 6]} />
        <meshStandardMaterial
          color={MUGTEE_TRIM}
          emissive={MUGTEE_GOLD}
          emissiveIntensity={0.25}
          roughness={0.6}
        />
      </mesh>

      <mesh position={[0, 0.02, 0.38]}>
        <sphereGeometry args={[0.28, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={MUGTEE_FACE} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[-0.11, 0.06, 0.44]} scale={[1, 1, 1]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial
          ref={leftEyeMat}
          color={MUGTEE_GOLD_EMISSIVE}
          emissive={MUGTEE_GOLD_EMISSIVE}
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0.11, 0.06, 0.44]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial
          ref={rightEyeMat}
          color={MUGTEE_GOLD_EMISSIVE}
          emissive={MUGTEE_GOLD_EMISSIVE}
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>

      <mesh position={[0, -0.08, 0.36]} rotation={[0.35, 0, 0]}>
        <torusGeometry args={[0.34, 0.025, 8, 24, Math.PI]} />
        <meshStandardMaterial
          color={MUGTEE_GOLD}
          emissive={MUGTEE_GOLD}
          emissiveIntensity={0.35}
          roughness={0.35}
          metalness={0.65}
        />
      </mesh>
    </group>
  )
}
