import type {
  RealtimeBrainRequest,
  RealtimeBrainResponse,
  RealtimePipelineConfig,
  RealtimePipelineHandlers,
  RealtimePipelineStage,
  RealtimeVoicePipeline,
} from '@/services/realtime/types'

function stage(handlers: RealtimePipelineHandlers | undefined, s: RealtimePipelineStage) {
  handlers?.onStage?.(s)
}

/** Stub brain — POSTs to /api/companion/realtime until production voice stack lands. */
export async function callCompanionBrain(
  req: RealtimeBrainRequest
): Promise<RealtimeBrainResponse> {
  const res = await fetch('/api/companion/realtime', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? 'Companion brain unavailable')
  }
  return (await res.json()) as RealtimeBrainResponse
}

/** V1 stub pipeline — text in, text out; voice/TTS/lip-sync hooks reserved. */
export function createStubRealtimePipeline(
  config: RealtimePipelineConfig,
  handlers: RealtimePipelineHandlers = {}
): RealtimeVoicePipeline {
  let listening = false

  return {
    config,

    async startListening() {
      if (config.voiceMode === 'off') return
      listening = true
      stage(handlers, 'capturing')
      // Production: WebRTC / Web Speech / ElevenLabs realtime
    },

    async stopListening() {
      listening = false
      stage(handlers, 'idle')
    },

    async processText(message: string): Promise<RealtimeBrainResponse> {
      stage(handlers, 'transcribing')
      handlers.onTranscript?.({ text: message, isFinal: true })

      stage(handlers, 'thinking')
      const reply = await callCompanionBrain({
        message,
        sessionId: `stub_${Date.now()}`,
      })

      if (config.enableTts) {
        stage(handlers, 'synthesizing')
        // Production: ElevenLabs TTS + viseme stream
      }

      stage(handlers, 'speaking')
      handlers.onReply?.(reply)
      stage(handlers, 'idle')
      return reply
    },

    shutdown() {
      listening = false
      stage(handlers, 'idle')
    },
  }
}

export type { RealtimeVoicePipeline }
