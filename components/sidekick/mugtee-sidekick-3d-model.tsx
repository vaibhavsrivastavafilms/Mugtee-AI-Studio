'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

const GOLD = '#d4af37'
const GOLD_EMISSIVE = '#f5c44d'
const HOOD = '#14110e'
const BODY = '#0a0806'
const TRIM = '#8a7028'

export function MugteeSidekick3DModel({ animated = true }: { animated?: boolean }) {
  const root = useRef<Group>(null)

  useFrame((state) => {
    if (!root.current || !animated) return
    const t = state.clock.elapsedTime
    root.current.rotation.y = Math.sin(t * 0.35) * 0.45
    const breathe = 1 + Math.sin(t * 1.6) * 0.025
    root.current.scale.setScalar(breathe)
  })

  return (
    <group ref={root} position={[0, -0.15, 0]}>
      {/* Torso */}
      <mesh position={[0, -0.55, 0]}>
        <capsuleGeometry args={[0.32, 0.42, 6, 12]} />
        <meshStandardMaterial color={BODY} roughness={0.85} metalness={0.08} />
      </mesh>

      {/* Hood shell */}
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.52, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
        <meshStandardMaterial color={HOOD} roughness={0.78} metalness={0.12} />
      </mesh>

      {/* Hood back drape */}
      <mesh position={[0, -0.05, -0.18]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.72, 0.55, 0.22]} />
        <meshStandardMaterial color={HOOD} roughness={0.82} metalness={0.1} />
      </mesh>

      {/* Cat ears */}
      <mesh position={[-0.28, 0.52, 0.02]} rotation={[0.15, -0.35, -0.45]}>
        <coneGeometry args={[0.14, 0.28, 8]} />
        <meshStandardMaterial color={HOOD} roughness={0.75} metalness={0.15} />
      </mesh>
      <mesh position={[0.28, 0.52, 0.02]} rotation={[0.15, 0.35, 0.45]}>
        <coneGeometry args={[0.14, 0.28, 8]} />
        <meshStandardMaterial color={HOOD} roughness={0.75} metalness={0.15} />
      </mesh>

      {/* Inner ear accent */}
      <mesh position={[-0.28, 0.5, 0.06]} rotation={[0.15, -0.35, -0.45]}>
        <coneGeometry args={[0.07, 0.16, 6]} />
        <meshStandardMaterial
          color={TRIM}
          emissive={GOLD}
          emissiveIntensity={0.25}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0.28, 0.5, 0.06]} rotation={[0.15, 0.35, 0.45]}>
        <coneGeometry args={[0.07, 0.16, 6]} />
        <meshStandardMaterial
          color={TRIM}
          emissive={GOLD}
          emissiveIntensity={0.25}
          roughness={0.6}
        />
      </mesh>

      {/* Face shadow recess */}
      <mesh position={[0, 0.02, 0.38]}>
        <sphereGeometry args={[0.28, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#050403" roughness={1} metalness={0} />
      </mesh>

      {/* Glowing eyes */}
      <mesh position={[-0.11, 0.06, 0.44]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial
          color={GOLD_EMISSIVE}
          emissive={GOLD_EMISSIVE}
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0.11, 0.06, 0.44]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial
          color={GOLD_EMISSIVE}
          emissive={GOLD_EMISSIVE}
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>

      {/* Gold hood trim */}
      <mesh position={[0, -0.08, 0.36]} rotation={[0.35, 0, 0]}>
        <torusGeometry args={[0.34, 0.025, 8, 24, Math.PI]} />
        <meshStandardMaterial
          color={GOLD}
          emissive={GOLD}
          emissiveIntensity={0.35}
          roughness={0.35}
          metalness={0.65}
        />
      </mesh>
    </group>
  )
}
