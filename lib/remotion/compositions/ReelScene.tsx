// Edge Tools no-inline-styles suppressed via .hintrc (Remotion requires inline styles).
import React from 'react'
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { buildParallaxLayers, parallaxLayerStyle } from '@/lib/motion/parallax-layers'
import { microAnimationAtFrame } from '@/lib/motion/micro-animation'
import { reelSceneOpacity, reelSceneTransformExtras } from '@/lib/remotion/reel-transitions'
import { ReelVisualEnhancements } from '@/lib/remotion/reel-visual-enhancements'
import type { ReelSceneInput, ReelSceneMotionConfig } from './types'
import { ReelParticleOverlay } from './ReelParticleOverlay'

function easedProgress(progress: number, easing?: ReelSceneMotionConfig['easing']): number {
  if (easing === 'ease-out') {
    return 1 - Math.pow(1 - progress, 2.2)
  }
  return progress
}

function motionValues(
  config: ReelSceneMotionConfig,
  progress: number,
  frame: number,
  fps: number
): { scale: number; translateX: number; translateY: number; rotate: number } {
  const t = easedProgress(progress, config.easing)
  let scale = interpolate(t, [0, 1], [config.scaleFrom, config.scaleTo])
  let translateX = interpolate(t, [0, 1], [config.translateXFrom, config.translateXTo])
  let translateY = interpolate(t, [0, 1], [config.translateYFrom, config.translateYTo])
  let rotate = interpolate(t, [0, 1], [config.rotateFrom ?? 0, config.rotateTo ?? 0])

  if (config.motionType === 'tracking') {
    const shake = Math.sin((frame / fps) * 8.5) * 3.5
    translateX += shake
    translateY += Math.cos((frame / fps) * 6.2) * 2
  }

  if (config.motionType === 'slow_orbit' || config.presetId === 'orbit' || config.presetId === 'orbit_light') {
    rotate += Math.sin((frame / fps) * 0.35) * 0.35
  }

  const micro = microAnimationAtFrame(
    frame,
    fps,
    config.animationIntensity ?? 20,
    { flicker: config.flicker }
  )
  scale *= micro.scaleMultiplier

  return { scale, translateX, translateY, rotate }
}

export function ReelScene({
  scene,
  sceneIndex,
}: {
  scene: ReelSceneInput
  sceneIndex: number
}) {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()
  const isOpeningScene = sceneIndex === 0

  const config = scene.motionConfig ?? fallbackLegacyConfig(scene, sceneIndex)
  const transitionType = isOpeningScene ? 'cut' : config.transitionType
  const { pushX, blurPx, leakOpacity } = reelSceneTransformExtras(
    frame,
    durationInFrames,
    transitionType,
    sceneIndex
  )

  const opacity =
    reelSceneOpacity(frame, durationInFrames, transitionType, sceneIndex, {
      skipEntryFade: isOpeningScene,
    }) *
    microAnimationAtFrame(frame, fps, config.animationIntensity ?? 20, {
      flicker: config.flicker,
    }).opacityMultiplier

  const progress = frame / Math.max(1, durationInFrames - 1)
  const { scale, translateX, translateY, rotate } = motionValues(config, progress, frame, fps)

  const useParallax =
    (config.depthEnabled || (config.parallaxOffset ?? 0) > 0) &&
    config.motionType !== 'tracking'

  const parallaxLayers = useParallax
    ? buildParallaxLayers({
        progress,
        baseScale: scale,
        translateX,
        translateY,
        offset: config.parallaxOffset,
        depthEnabled: config.depthEnabled,
      })
    : []

  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  }

  const particleType = config.particleType ?? 'none'
  const particleDensity =
    particleType === 'dust' ? 0.7 : particleType === 'fog' ? 0.55 : 0.45

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0807', opacity }}>
      {useParallax
        ? parallaxLayers.map((layer) => (
            <AbsoluteFill key={layer.id} style={parallaxLayerStyle(layer)}>
              <Img src={scene.imageSrc} style={imgStyle} />
            </AbsoluteFill>
          ))
        : null}

      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate(${translateX + pushX}px, ${translateY}px) rotate(${rotate}deg)`,
          filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
        }}
      >
        <Img src={scene.imageSrc} style={imgStyle} />
      </AbsoluteFill>

      {leakOpacity > 0 ? (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background:
              'linear-gradient(135deg, rgba(255,200,120,0.45) 0%, transparent 55%, rgba(255,160,80,0.25) 100%)',
            opacity: leakOpacity,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}

      {config.flicker ? (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background:
              'radial-gradient(circle at 30% 70%, rgba(255, 160, 80, 0.2), transparent 55%)',
            opacity: microAnimationAtFrame(frame, fps, config.animationIntensity ?? 20, {
              flicker: true,
            }).flickerOpacity,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}

      <ReelParticleOverlay particleType={particleType} density={particleDensity} />
      <ReelVisualEnhancements
        animationIntensity={config.animationIntensity ?? 20}
        flicker={config.flicker}
      />

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(10,8,7,0.15) 0%, rgba(10,8,7,0) 28%, rgba(10,8,7,0.55) 72%, rgba(10,8,7,0.92) 100%)',
        }}
      />
    </AbsoluteFill>
  )
}

function fallbackLegacyConfig(
  scene: ReelSceneInput,
  sceneIndex: number
): ReelSceneMotionConfig {
  const motion = scene.motion ?? (sceneIndex % 2 === 0 ? 'zoom-in' : 'pan-right')

  if (motion === 'zoom-in') {
    return {
      presetId: 'push_in',
      motionType: 'push_in',
      scaleFrom: 1,
      scaleTo: 1.18,
      translateXFrom: 0,
      translateXTo: 0,
      translateYFrom: 0,
      translateYTo: 0,
      easing: 'ease-out',
      animationIntensity: 20,
      transitionType: sceneIndex === 0 ? 'cut' : 'cross_fade',
    }
  }
  if (motion === 'zoom-out') {
    return {
      presetId: 'pull_out',
      motionType: 'pull_out',
      scaleFrom: 1.18,
      scaleTo: 1.02,
      translateXFrom: 0,
      translateXTo: 0,
      translateYFrom: 0,
      translateYTo: 0,
      easing: 'ease-out',
      animationIntensity: 20,
      transitionType: 'film_fade',
    }
  }
  if (motion === 'pan-left') {
    return {
      presetId: 'slow_pan_left',
      motionType: 'pan_left',
      scaleFrom: 1.12,
      scaleTo: 1.12,
      translateXFrom: 24,
      translateXTo: -24,
      translateYFrom: 0,
      translateYTo: 0,
      easing: 'linear',
      animationIntensity: 20,
      transitionType: 'cinematic_dissolve',
    }
  }
  return {
    presetId: 'slow_pan_right',
    motionType: 'pan_right',
    scaleFrom: 1.12,
    scaleTo: 1.12,
    translateXFrom: -24,
    translateXTo: 24,
    translateYFrom: 0,
    translateYTo: 0,
    easing: 'linear',
    animationIntensity: 20,
    transitionType: 'blur_fade',
  }
}
