/**
 * Scene-based production graph — each scene is an independent unit of work.
 */

import type { GeneratedScene } from '@/lib/cinematic/generation'
import { assignCameraForScene } from '@/lib/production-os/v3/camera-director'
import type { SceneProductionUnit } from '@/lib/production-os/v3/types'

export function buildSceneProductionGraph(scenes: GeneratedScene[]): SceneProductionUnit[] {
  return scenes.map((scene, index) => {
    const cam = assignCameraForScene(index, scene)
    return {
      id: scene.id || `scene-${index + 1}`,
      index,
      story: scene.description || scene.title || '',
      script: scene.description || '',
      storyboardPrompt: scene.imagePrompt || scene.visualPrompt || scene.description || '',
      characters: [],
      environment: scene.environment || '',
      voiceUrl: null,
      musicCue: null,
      imageUrl: scene.imageUrl?.trim() || null,
      videoUrl: scene.videoUrl?.trim() || null,
      animationPreset: cam.presetId,
      transition: cam.transition,
      durationSec: Math.max(2.5, scene.duration ?? 4),
      status: scene.imageUrl?.trim()
        ? scene.videoUrl?.trim()
          ? 'completed'
          : 'queued'
        : 'queued',
      camera: {
        lens: cam.lens,
        movement: cam.movement,
        composition: cam.composition,
        focus: cam.focus,
        depth: cam.depth,
      },
      checkpoint: {
        image: Boolean(scene.imageUrl?.trim() || scene.imageAssetPath?.trim()),
        voice: false,
        animation: Boolean(scene.videoUrl?.trim()),
        render: false,
      },
      errors: [],
      updatedAt: Date.now(),
    }
  })
}

/** Resume pointer — first incomplete scene, never restart whole movie. */
export function nextSceneResumeIndex(units: SceneProductionUnit[]): {
  sceneIndex: number
  resumeFrom: 'image' | 'animation' | 'voice' | 'render' | 'done'
} {
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!
    if (!u.checkpoint.image) return { sceneIndex: i, resumeFrom: 'image' }
    if (!u.checkpoint.animation && !u.videoUrl) {
      // animation optional when using Remotion motion — still track
      return { sceneIndex: i, resumeFrom: 'animation' }
    }
  }
  return { sceneIndex: Math.max(0, units.length - 1), resumeFrom: 'done' }
}

export function markSceneCheckpoint(
  units: SceneProductionUnit[],
  sceneId: string,
  key: keyof SceneProductionUnit['checkpoint'],
  value = true
): SceneProductionUnit[] {
  return units.map((u) =>
    u.id === sceneId
      ? {
          ...u,
          checkpoint: { ...u.checkpoint, [key]: value },
          status: value && key === 'image' && u.checkpoint.animation ? 'completed' : u.status,
          updatedAt: Date.now(),
        }
      : u
  )
}
