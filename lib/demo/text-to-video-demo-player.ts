import type { VideoScene } from '@/app/api/ai/video-generator/route'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { TextToVideoDemoTemplate } from '@/lib/demo/text-to-video-templates'

function parseSceneDurationSec(duration: string): number {
  const match = duration.match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : 5
}

export function videoSceneToGeneratedScene(
  scene: VideoScene,
  imageUrl?: string
): GeneratedScene {
  return {
    id: `demo-scene-${scene.sceneNumber}`,
    title: `Scene ${scene.sceneNumber}`,
    description: scene.narration,
    duration: parseSceneDurationSec(scene.duration),
    visualPrompt: scene.visualPrompt,
    imagePrompt: scene.visualPrompt,
    cameraAngle: scene.cameraMovement,
    lightingMood: 'cinematic',
    environment: '',
    colorPalette: '',
    movementStyle: scene.cameraMovement,
    imageUrl: imageUrl ?? null,
  }
}

/** Maps cached demo template data into Quick Cut preview player scenes. */
export function demoTemplateToGeneratedScenes(
  template: TextToVideoDemoTemplate
): GeneratedScene[] {
  return template.output.scenes.map((scene, index) =>
    videoSceneToGeneratedScene(scene, template.sceneImageUrls[index])
  )
}
