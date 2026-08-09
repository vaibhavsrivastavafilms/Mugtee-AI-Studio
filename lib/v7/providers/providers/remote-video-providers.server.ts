import 'server-only'

import {
  runwayVideoProvider,
  seedanceVideoProvider,
} from '@/lib/v7/providers/scene-video-legacy-bridge.server'
import { wanVideoProvider } from '@/lib/v7/providers/providers/wan-video.server'
import { createHttpVideoProvider } from '@/lib/v7/providers/video-provider-base.server'

export { wanVideoProvider }
export { seedanceVideoProvider, runwayVideoProvider }

export const cogVideoXProvider = createHttpVideoProvider({
  id: 'cogvideox',
  displayName: 'CogVideoX',
  modelId: 'cogvideox',
  endpointEnv: 'COGVIDEOX_VIDEO_URL',
  apiKeyEnv: 'COGVIDEOX_VIDEO_API_KEY',
  estimateMs: 240_000,
})

export const hunyuanVideoProvider = createHttpVideoProvider({
  id: 'hunyuan',
  displayName: 'HunyuanVideo',
  modelId: 'hunyuan-video',
  endpointEnv: 'HUNYUAN_VIDEO_URL',
  apiKeyEnv: 'HUNYUAN_VIDEO_API_KEY',
  estimateMs: 240_000,
})

export const mochiVideoProvider = createHttpVideoProvider({
  id: 'mochi',
  displayName: 'Mochi',
  modelId: 'mochi',
  endpointEnv: 'MOCHI_VIDEO_URL',
  apiKeyEnv: 'MOCHI_VIDEO_API_KEY',
  estimateMs: 180_000,
})

export const ltxVideoProvider = createHttpVideoProvider({
  id: 'ltx',
  displayName: 'LTX Video',
  modelId: 'ltx-video',
  endpointEnv: 'LTX_VIDEO_URL',
  apiKeyEnv: 'LTX_VIDEO_API_KEY',
  estimateMs: 180_000,
})

export const animateDiffVideoProvider = createHttpVideoProvider({
  id: 'animatediff',
  displayName: 'AnimateDiff',
  modelId: 'animatediff',
  endpointEnv: 'ANIMATEDIFF_VIDEO_URL',
  apiKeyEnv: 'ANIMATEDIFF_VIDEO_API_KEY',
  estimateMs: 120_000,
})
