'use client'

import { create } from 'zustand'
import type { MugteeAvatarState } from '@/components/avatar/types'
import type { DetectedCreatorLanguage } from '@/lib/i18n/detect-creator-language'
import type { VoiceInputMode } from '@/services/realtime/types'
import { COMPANION_GREETING_DEFAULT, pickPersonalityLine } from '@/lib/companion/personality'
import { isCompanionExperimentalVoiceEnabled } from '@/lib/companion/access'
import { createStubRealtimePipeline } from '@/services/realtime/pipeline'

export type CompanionMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}

export type RecentOpportunity = {
  id: string
  title: string
  hook: string
  href: string
}

type MugteeCompanionState = {
  avatarState: MugteeAvatarState
  previousAvatarState: MugteeAvatarState | null
  voiceMode: VoiceInputMode
  isConversationActive: boolean
  isProcessing: boolean
  inputDraft: string
  transcript: string
  lastReply: string
  messages: CompanionMessage[]
  detectedLanguage: DetectedCreatorLanguage | null
  recentOpportunities: RecentOpportunity[]
  statusLine: string

  setAvatarState: (state: MugteeAvatarState) => void
  transitionAvatarState: (state: MugteeAvatarState) => void
  setVoiceMode: (mode: VoiceInputMode) => void
  setInputDraft: (text: string) => void
  setDetectedLanguage: (lang: DetectedCreatorLanguage | null) => void
  setRecentOpportunities: (items: RecentOpportunity[]) => void
  startConversation: () => void
  endConversation: () => void
  submitPrompt: (text: string) => Promise<void>
  setListening: (listening: boolean) => void
  resetSession: () => void
}

function msgId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function avatarFromReply(state?: string): MugteeAvatarState {
  if (state === 'happy' || state === 'celebrating' || state === 'warning' || state === 'speaking') {
    return state
  }
  return 'idle'
}

export const useMugteeCompanionStore = create<MugteeCompanionState>((set, get) => ({
  avatarState: 'idle',
  previousAvatarState: null,
  voiceMode: 'off',
  isConversationActive: false,
  isProcessing: false,
  inputDraft: '',
  transcript: '',
  lastReply: '',
  messages: [],
  detectedLanguage: null,
  recentOpportunities: [],
  statusLine: COMPANION_GREETING_DEFAULT,

  setAvatarState: (state) =>
    set((s) => ({
      previousAvatarState: s.avatarState,
      avatarState: state,
    })),

  transitionAvatarState: (state) => {
    const prev = get().avatarState
    if (prev === state) return
    set({ previousAvatarState: prev, avatarState: state })
  },

  setVoiceMode: (mode) => {
    if (mode === 'hands-free' && !isCompanionExperimentalVoiceEnabled()) return
    set({ voiceMode: mode })
  },
  setInputDraft: (text) => set({ inputDraft: text }),
  setDetectedLanguage: (lang) => set({ detectedLanguage: lang }),
  setRecentOpportunities: (items) => set({ recentOpportunities: items }),

  startConversation: () =>
    set({
      isConversationActive: true,
      statusLine: pickPersonalityLine('greetingVariants'),
      avatarState: 'happy',
    }),

  endConversation: () =>
    set({
      isConversationActive: false,
      avatarState: 'idle',
      transcript: '',
      statusLine: pickPersonalityLine('greetingVariants'),
    }),

  setListening: (listening) => {
    set({
      avatarState: listening ? 'listening' : get().isProcessing ? 'thinking' : 'idle',
      isConversationActive: listening ? true : get().isConversationActive,
    })
  },

  submitPrompt: async (text) => {
    const trimmed = text.trim()
    if (!trimmed || get().isProcessing) return

    const userMsg: CompanionMessage = {
      id: msgId(),
      role: 'user',
      content: trimmed,
      ts: Date.now(),
    }

    set((s) => ({
      isProcessing: true,
      isConversationActive: true,
      avatarState: 'thinking',
      statusLine: pickPersonalityLine('thinkingPhrases'),
      inputDraft: '',
      transcript: trimmed,
      messages: [...s.messages, userMsg].slice(-20),
    }))

    const pipeline = createStubRealtimePipeline(
      {
        voiceMode: get().voiceMode,
        enableTts: get().voiceMode !== 'off',
        enableLipSync: false,
      },
      {
        onStage: (stage) => {
          if (stage === 'thinking') get().transitionAvatarState('thinking')
          if (stage === 'speaking') get().transitionAvatarState('speaking')
        },
      }
    )

    try {
      const reply = await pipeline.processText(trimmed)
      const nextAvatar = avatarFromReply(reply.avatarState)
      const assistantMsg: CompanionMessage = {
        id: msgId(),
        role: 'assistant',
        content: reply.reply,
        ts: Date.now(),
      }

      set((s) => ({
        isProcessing: false,
        avatarState: nextAvatar,
        lastReply: reply.reply,
        statusLine: reply.reply.slice(0, 120),
        messages: [...s.messages, assistantMsg].slice(-20),
        detectedLanguage: reply.language ?? s.detectedLanguage,
      }))

      if (nextAvatar === 'happy') {
        setTimeout(() => {
          if (!get().isProcessing) get().transitionAvatarState('idle')
        }, 2400)
      }
    } catch {
      set({
        isProcessing: false,
        avatarState: 'warning',
        statusLine: pickPersonalityLine('warningPhrases'),
        lastReply: '',
      })
      setTimeout(() => {
        if (!get().isProcessing) get().transitionAvatarState('idle')
      }, 3000)
    } finally {
      pipeline.shutdown()
    }
  },

  resetSession: () =>
    set({
      avatarState: 'idle',
      previousAvatarState: null,
      isConversationActive: false,
      isProcessing: false,
      inputDraft: '',
      transcript: '',
      lastReply: '',
      messages: [],
      statusLine: pickPersonalityLine('greetingVariants'),
    }),
}))
