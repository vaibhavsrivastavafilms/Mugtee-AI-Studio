import 'server-only'

import { runV7ImageProviderChain } from '@/lib/v7/providers/image-registry.server'
import type { V7ImageGenerationInput, V7ImageGenerationResult } from '@/lib/v7/providers/image-provider.types'

export { validateV7ImageProvidersOnStartup } from '@/lib/v7/providers/image-registry.server'

export async function generateV7SceneImage(
  input: V7ImageGenerationInput
): Promise<V7ImageGenerationResult> {
  return runV7ImageProviderChain(input)
}
