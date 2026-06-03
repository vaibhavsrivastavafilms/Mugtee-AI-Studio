'use client'

import { MugteeAgentProvider } from '@/components/mugtee-os/mugtee-agent-provider'
import { CommandBar, CommandBarHint } from '@/components/mugtee-os/command-bar'
import { VoiceInput } from '@/components/mugtee-os/voice-input'
import { useMugteeAgentStore } from '@/stores/mugtee-agent-store'

function VoiceBridge() {
  const sendCommand = useMugteeAgentStore((s) => s.sendCommand)
  return <VoiceInput onFinalTranscript={(text) => void sendCommand(text)} />
}

/** Global Cmd+K + voice — mount in studio shell. */
export function MugteeCommandCenter() {
  return (
    <MugteeAgentProvider>
      <CommandBar />
      <CommandBarHint />
      <VoiceBridge />
    </MugteeAgentProvider>
  )
}
