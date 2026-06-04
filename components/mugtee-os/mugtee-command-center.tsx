'use client'

import { MugteeAgentProvider } from '@/components/mugtee-os/mugtee-agent-provider'
import { CommandBar, CommandBarHint } from '@/components/mugtee-os/command-bar'
import { VoiceInput } from '@/components/mugtee-os/voice-input'
import { useMugteeAgentStore } from '@/stores/mugtee-agent-store'
import { isCompanionExperimentalVoiceEnabled } from '@/lib/companion/access'

function VoiceBridge() {
  const sendCommand = useMugteeAgentStore((s) => s.sendCommand)
  if (!isCompanionExperimentalVoiceEnabled()) return null
  return <VoiceInput onFinalTranscript={(text) => void sendCommand(text)} />
}

/** Global Cmd+K — mount in studio shell. Experimental voice gated separately. */
export function MugteeCommandCenter() {
  return (
    <MugteeAgentProvider>
      <CommandBar />
      <CommandBarHint />
      <VoiceBridge />
    </MugteeAgentProvider>
  )
}
