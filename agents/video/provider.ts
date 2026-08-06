import type { SceneVideoRequest, VideoResult } from '@/agents/video/schema'



/** Pluggable video generation provider contract. */

export interface VideoProvider {

  readonly id: string

  generate(scene: SceneVideoRequest, params: V3VideoProviderParams): Promise<VideoResult>

}



export type V3VideoProvider = VideoProvider



export type V3VideoProviderParams = {

  userId: string

  projectId: string

  storagePath: string

}



export type V3VideoProviderId = 'veo' | 'runway' | 'kling' | 'pika' | 'luma' | 'hailuo'


