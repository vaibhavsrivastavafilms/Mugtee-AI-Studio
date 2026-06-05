import { v4 as uuidv4 } from 'uuid'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { DirectorBlueprint, StoryboardPlan, VoiceProfile } from '@/lib/director/types'
import type { StoryDirectorPackage } from '@/lib/ai/director/story-director-engine'
import { summaryFromPackage, topHookFromPackage } from '@/lib/ai/director/story-director-engine'

export function storyPackageToBlueprint(
  pkg: StoryDirectorPackage,
  prev?: DirectorBlueprint | null
): DirectorBlueprint {
  const hook = topHookFromPackage(pkg)
  const sceneBeats = pkg.scenes.map((s) => ({
    index: s.index,
    beat: s.beat || s.title,
    durationSec: s.durationSec,
  }))
  return {
    title: prev?.title || pkg.scenes[0]?.title || 'Untitled',
    hook: hook || prev?.hook || '',
    summary: summaryFromPackage(pkg) || prev?.summary || '',
    script: pkg.fullCinematicScript || prev?.script || '',
    sceneBeats,
    locked: prev?.locked ?? false,
    approved: prev?.approved ?? false,
  }
}

export function storyPackageToStoryboardPlan(pkg: StoryDirectorPackage): StoryboardPlan {
  return {
    scenes: pkg.storyboardFrames.map((frame) => {
      const visual = pkg.visualDirection.find((v) => v.sceneIndex === frame.sceneIndex)
      const scene = pkg.scenes.find((s) => s.index === frame.sceneIndex)
      return {
        sceneIndex: frame.sceneIndex,
        visualPrompt: frame.frameDescription || scene?.beat || '',
        cameraSetup: visual?.camera || visual?.shotType || '',
        composition: visual?.composition || frame.focalPoint,
        mood: visual?.mood || '',
        transition: frame.transition,
      }
    }),
  }
}

export function storyPackageToVoiceProfile(pkg: StoryDirectorPackage): VoiceProfile {
  const vo = pkg.voiceoverDirection
  const sceneNotes: Record<string, string> = {}
  for (const note of vo.sceneNotes) {
    sceneNotes[String(note.sceneIndex)] = note.direction
  }
  return {
    narratorTone: vo.tone,
    pacing: vo.pacing,
    emphasis: vo.emphasis.join('; '),
    dialect: '',
    sceneNotes,
  }
}

export function storyPackageToGeneratedScenes(pkg: StoryDirectorPackage): GeneratedScene[] {
  return pkg.scenes.map((scene) => {
    const visual = pkg.visualDirection.find((v) => v.sceneIndex === scene.index)
    const frame = pkg.storyboardFrames.find((f) => f.sceneIndex === scene.index)
    const imagePrompt = [
      frame?.frameDescription,
      visual?.composition,
      visual?.lighting,
      visual?.mood,
    ]
      .filter(Boolean)
      .join(' — ')
    return {
      id: uuidv4(),
      title: scene.title,
      description: scene.beat || scene.narration,
      duration: scene.durationSec,
      visualPrompt: frame?.frameDescription || scene.beat,
      imagePrompt: imagePrompt || scene.beat,
      cameraAngle: visual?.camera || visual?.shotType || '',
      lightingMood: visual?.lighting || '',
      environment: visual?.mood || '',
      colorPalette: visual?.colorGrade || '',
      movementStyle: visual?.movement || '',
    }
  })
}
