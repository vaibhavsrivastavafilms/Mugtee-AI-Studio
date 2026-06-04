import { sceneArcRole } from '@/lib/cinematic/regen-context'

/** Mockup-style scene beat tags for studio scene cards. */
export function sceneDisplayTag(index: number, total: number): string {
  const role = sceneArcRole(index, total)
  switch (role) {
    case 'hook':
      return 'HOOK'
    case 'tension':
      return index <= Math.max(2, Math.ceil(total * 0.35)) ? 'EXPLANATION' : 'ACTION'
    case 'peak':
      return 'SOLUTION'
    case 'release':
      return 'ACTION'
    case 'aftertaste':
      return 'CTA'
    default:
      return 'BEAT'
  }
}
