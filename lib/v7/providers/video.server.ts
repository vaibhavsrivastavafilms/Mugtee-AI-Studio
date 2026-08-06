import 'server-only'

import { runV7VideoProviderChain } from '@/lib/v7/providers/video-registry.server'
import type { V7VideoGenerationInput, V7VideoGenerationResult } from '@/lib/v7/providers/video-provider.types'

export { validateV7VideoProvidersOnStartup } from '@/lib/v7/providers/video-registry.server'

export async function generateV7SceneVideo(
  input: V7VideoGenerationInput
): Promise<V7VideoGenerationResult> {
  return runV7VideoProviderChain(input)
}
