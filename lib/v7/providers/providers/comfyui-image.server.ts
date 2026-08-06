import 'server-only'

import { checkComfyUiHealth, generateComfyUiImage, hasComfyUiUrl } from '@/lib/image-providers/comfyui'
import { createRemoteUrlImageProvider } from '@/lib/v7/providers/image-provider-base.server'

export const comfyUiImageProvider = createRemoteUrlImageProvider({
  id: 'comfyui',
  displayName: 'ComfyUI',
  modelId: process.env.COMFYUI_CHECKPOINT?.trim() ?? 'sd_xl_base_1.0.safetensors',
  isConfigured: hasComfyUiUrl,
  estimateMs: 120_000,
  healthCheck: async () => {
    if (!hasComfyUiUrl()) return { healthy: false, message: 'COMFYUI_BASE_URL not configured' }
    const health = await checkComfyUiHealth()
    return { healthy: health.healthy, message: health.message }
  },
  generateRemoteUrl: async (input) =>
    generateComfyUiImage({
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      width: input.width,
      height: input.height,
      seed: input.seed,
    }),
})
