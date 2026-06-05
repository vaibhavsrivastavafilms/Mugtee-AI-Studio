import { loadDirectorStudioSnapshot, verifyDirectorProject } from '@/lib/director/director-db.server'
import {
  getOrCreateCreatorMemory,
  updateCreatorMemoryFromAnalysis,
} from '@/lib/director/memory/creator-memory.server'
import type {
  CreatorMemoryProfile,
  DirectorProjectAnalysis,
  MemoryFrequencyMap,
} from '@/lib/director/memory/types'

function bump(
  map: MemoryFrequencyMap | undefined,
  key: string | null | undefined,
  weight = 1
): MemoryFrequencyMap {
  const base = map ?? {}
  if (!key?.trim()) return base
  const k = key.trim().slice(0, 120)
  const prev = base[k]
  return {
    ...base,
    [k]: {
      count: (prev?.count ?? 0) + 1,
      weight: (prev?.weight ?? 0) + weight,
    },
  }
}

function classifyHookStyle(hook: string): string {
  const h = hook.toLowerCase()
  if (h.includes('?')) return 'question'
  if (h.includes('never') || h.includes("don't") || h.includes('stop')) return 'contrarian'
  if (h.includes('secret') || h.includes('truth') || h.includes('hidden')) return 'revelation'
  if (h.includes('imagine') || h.includes('picture')) return 'visual-invite'
  if (h.match(/^\d/)) return 'stat-led'
  return 'statement'
}

function classifyMotionUsage(style: string): { zoom: string; pan: string; drift: string } {
  const s = style.toLowerCase()
  const zoom = s.includes('zoom') ? 'zoom-heavy' : s.includes('push') ? 'push-in' : 'minimal-zoom'
  const pan = s.includes('pan') ? 'pan-heavy' : s.includes('track') ? 'tracking' : 'static-pan'
  const drift = s.includes('drift') || s.includes('float') ? 'drift' : 'anchored'
  return { zoom, pan, drift }
}

function classifyVoiceIntensity(tone: string, pacing: string): string {
  const combined = `${tone} ${pacing}`.toLowerCase()
  if (combined.includes('urgent') || combined.includes('intense')) return 'high'
  if (combined.includes('calm') || combined.includes('soft')) return 'low'
  if (combined.includes('dramatic')) return 'dramatic'
  return 'moderate'
}

/** Extract director signals from a completed project snapshot. */
export async function analyzeDirectorProject(
  projectId: string,
  userId: string
): Promise<DirectorProjectAnalysis | null> {
  const project = await verifyDirectorProject(projectId, userId)
  if (!project) return null

  const snapshot = await loadDirectorStudioSnapshot(projectId, userId)
  if (!snapshot?.projectState.directorApproved) return null

  let storyMemory: DirectorProjectAnalysis['storyMemory'] = {
    frameworks: {},
    hookStyles: {},
    emotionalArcs: {},
  }
  let visualMemory: DirectorProjectAnalysis['visualMemory'] = {
    shotTypes: {},
    lighting: {},
    colorPalettes: {},
    composition: {},
    cameraMovements: {},
  }
  let voiceMemory: DirectorProjectAnalysis['voiceMemory'] = {
    narratorTones: {},
    pacing: {},
    intensity: {},
    narrationTypes: {},
  }
  let motionMemory: DirectorProjectAnalysis['motionMemory'] = {
    motionStyles: {},
    zoomUsage: {},
    panUsage: {},
    driftUsage: {},
    pacing: {},
  }

  const fw = snapshot.projectState.activeFramework
  if (fw?.framework) {
    storyMemory.frameworks = bump(storyMemory.frameworks, fw.framework, 2)
  }
  if (fw?.coreEmotion) {
    storyMemory.emotionalArcs = bump(storyMemory.emotionalArcs, fw.coreEmotion)
  }

  const direction = snapshot.storyDirections.activeStoryDirection
  if (direction?.hook) {
    storyMemory.hookStyles = bump(
      storyMemory.hookStyles,
      classifyHookStyle(direction.hook),
      1.5
    )
  }

  const treatment = snapshot.directorTreatment
  if (treatment?.emotionalArc) {
    storyMemory.emotionalArcs = bump(storyMemory.emotionalArcs, treatment.emotionalArc)
  }
  if (treatment?.lightingStyle) {
    visualMemory.lighting = bump(visualMemory.lighting, treatment.lightingStyle)
  }
  if (treatment?.colorPalette) {
    visualMemory.colorPalettes = bump(visualMemory.colorPalettes, treatment.colorPalette)
  }
  if (treatment?.cameraLanguage) {
    visualMemory.cameraMovements = bump(visualMemory.cameraMovements, treatment.cameraLanguage)
  }

  const camera = snapshot.cameraLanguage
  if (camera?.scenes?.length) {
    for (const scene of camera.scenes) {
      visualMemory.shotTypes = bump(visualMemory.shotTypes, scene.shotType)
      visualMemory.lighting = bump(visualMemory.lighting, scene.lighting)
      visualMemory.composition = bump(visualMemory.composition, scene.framing)
      visualMemory.cameraMovements = bump(visualMemory.cameraMovements, scene.movement)
    }
  }

  const storyboard = snapshot.projectState.storyboardPlan
  if (storyboard?.scenes?.length) {
    for (const scene of storyboard.scenes) {
      visualMemory.composition = bump(visualMemory.composition, scene.composition)
    }
  }

  const voice = snapshot.voiceProfile
  if (voice) {
    voiceMemory.narratorTones = bump(voiceMemory.narratorTones, voice.narratorTone)
    voiceMemory.pacing = bump(voiceMemory.pacing, voice.pacing)
    voiceMemory.intensity = bump(
      voiceMemory.intensity,
      classifyVoiceIntensity(voice.narratorTone, voice.pacing)
    )
    voiceMemory.narrationTypes = bump(
      voiceMemory.narrationTypes,
      voice.dialect?.trim() ? 'character-voice' : 'narrator'
    )
  }

  const motion = snapshot.motionPlan
  if (motion?.globalPacing) {
    motionMemory.pacing = bump(motionMemory.pacing, motion.globalPacing)
  }
  if (motion?.scenes?.length) {
    for (const scene of motion.scenes) {
      motionMemory.motionStyles = bump(motionMemory.motionStyles, scene.motionStyle)
      const usage = classifyMotionUsage(scene.motionStyle)
      motionMemory.zoomUsage = bump(motionMemory.zoomUsage, usage.zoom)
      motionMemory.panUsage = bump(motionMemory.panUsage, usage.pan)
      motionMemory.driftUsage = bump(motionMemory.driftUsage, usage.drift)
    }
  }

  const pkg = snapshot.projectState.storyDirectorPackage
  const blueprint = snapshot.projectState.blueprint
  const sceneCount =
    pkg?.scenes?.length ??
    blueprint?.sceneBeats?.length ??
    (Array.isArray(project.scenes) ? project.scenes.length : 0)

  let totalDuration = 0
  if (motion?.scenes?.length) {
    totalDuration = motion.scenes.reduce((sum, s) => sum + (s.durationSec ?? 0), 0)
  } else if (blueprint?.sceneBeats?.length) {
    totalDuration = blueprint.sceneBeats.reduce((sum, b) => sum + (b.durationSec ?? 5), 0)
  } else {
    totalDuration = sceneCount * 5
  }

  return {
    projectId,
    storyMemory,
    visualMemory,
    voiceMemory,
    motionMemory,
    creatorPreferences: {
      avgSceneCount: sceneCount,
      avgDurationSec: totalDuration,
      preferredFramework: fw?.framework ?? null,
      preferredGenre: treatment?.genre ?? null,
      preferredMood: treatment?.mood ?? null,
    },
  }
}

/** Run analysis and persist merged creator memory. */
export async function learnFromDirectorProject(
  projectId: string,
  userId: string
): Promise<{ profile: CreatorMemoryProfile; analysis: DirectorProjectAnalysis } | null> {
  const analysis = await analyzeDirectorProject(projectId, userId)
  if (!analysis) return null

  const snapshot = await loadDirectorStudioSnapshot(projectId, userId)
  const profile = await updateCreatorMemoryFromAnalysis(userId, analysis, {
    genre: snapshot?.directorTreatment?.genre ?? null,
    mood: snapshot?.directorTreatment?.mood ?? null,
  })

  return { profile, analysis }
}

/** Load memory without learning — used for prompt injection. */
export async function resolveDirectorCreatorMemory(
  userId: string
): Promise<CreatorMemoryProfile> {
  return getOrCreateCreatorMemory(userId)
}
