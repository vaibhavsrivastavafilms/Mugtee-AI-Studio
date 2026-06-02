import type { DetectedCreatorLanguage } from '@/lib/i18n/detect-creator-language'

/** Realtime voice pipeline stage identifiers (V1 scaffolding). */
export type RealtimePipelineStage =
  | 'idle'
  | 'capturing'
  | 'transcribing'
  | 'thinking'
  | 'synthesizing'
  | 'speaking'
  | 'error'

export type VoiceInputMode = 'off' | 'push-to-talk' | 'hands-free'

export type RealtimeTranscript = {
  text: string
  isFinal: boolean
  language?: DetectedCreatorLanguage | null
}

export type RealtimeBrainRequest = {
  message: string
  sessionId: string
  language?: DetectedCreatorLanguage | null
  memoryContext?: string
  systemPrompt?: string
}

export type RealtimeBrainResponse = {
  reply: string
  avatarState?: 'speaking' | 'happy' | 'warning' | 'idle'
  language?: DetectedCreatorLanguage | null
}

export type RealtimeTtsRequest = {
  text: string
  voiceId?: string
  language?: string
}

export type RealtimeTtsResponse = {
  audioUrl?: string
  /** Stub — lip sync viseme weights keyed by time ms */
  visemes?: Array<{ t: number; w: number }>
}

export type RealtimePipelineConfig = {
  voiceMode: VoiceInputMode
  enableTts: boolean
  enableLipSync: boolean
}

export type RealtimePipelineHandlers = {
  onStage?: (stage: RealtimePipelineStage) => void
  onTranscript?: (t: RealtimeTranscript) => void
  onReply?: (reply: RealtimeBrainResponse) => void
  onError?: (message: string) => void
}

export interface RealtimeVoicePipeline {
  config: RealtimePipelineConfig
  startListening(): Promise<void>
  stopListening(): Promise<void>
  processText(message: string): Promise<RealtimeBrainResponse>
  shutdown(): void
}
