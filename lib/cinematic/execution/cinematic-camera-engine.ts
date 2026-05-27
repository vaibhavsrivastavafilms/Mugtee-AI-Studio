export {
  cameraDirectionForRole as planCameraDirection,
} from '@/lib/cinematic/execution/cinematic-storyboard-engine'

export function emotionalFramingHint(role: string): string {
  if (role === 'peak') return 'Subject occupies emotional center; shallow depth'
  if (role === 'hook') return 'Visual question in first second'
  return 'Off-center composition with cinematic negative space'
}

export function movementDirectionForPacing(
  role: string,
  duration: number
): string {
  if (duration <= 3) return 'minimal movement — held frame'
  if (role === 'tension') return 'slow handheld drift'
  if (role === 'peak') return 'imperceptible push-in'
  return 'controlled cinematic movement'
}

export function cinematicShotFlow(
  sceneIndex: number,
  totalScenes: number
): string[] {
  const steps = ['establish', 'develop', 'intensify', 'resolve', 'hold']
  const idx = Math.min(
    steps.length - 1,
    Math.floor(((sceneIndex - 1) / Math.max(totalScenes - 1, 1)) * (steps.length - 1))
  )
  return steps.slice(0, idx + 1).map((s) => s.trim())
}
