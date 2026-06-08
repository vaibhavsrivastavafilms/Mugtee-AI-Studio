'use client'

import { create } from 'zustand'
import type {
  AgentReport,
  AgentStatesMap,
  CreativeAlignmentScore,
  CreativeTeamAgentId,
  CreativeTeamPackage,
} from '@/lib/creative-team/types'
import { DEFAULT_AGENT_STATES } from '@/lib/creative-team/types'

type CreativeTeamState = {
  creativeTeamPackage: CreativeTeamPackage | null
  alignmentScore: CreativeAlignmentScore | null
  agentStates: AgentStatesMap
  loading: boolean
  error: string | null

  loadCreativeTeam: (projectId: string) => Promise<void>
  runCreativeTeam: (projectId: string, agentId?: CreativeTeamAgentId) => Promise<void>
  acceptAgent: (agentId: CreativeTeamAgentId) => Promise<void>
  rejectAgent: (agentId: CreativeTeamAgentId) => Promise<void>
  regenerateAgent: (agentId: CreativeTeamAgentId) => Promise<void>
  reset: () => void
}

function reportForAgent(pkg: CreativeTeamPackage, agentId: CreativeTeamAgentId): AgentReport | null {
  const map: Record<CreativeTeamAgentId, AgentReport | null> = {
    'story-strategist': pkg.storyStrategy,
    'executive-producer': pkg.producerReport,
    screenwriter: pkg.screenwriterReport,
    cinematographer: pkg.cinematographyReport,
    'voice-director': pkg.voiceReport,
    'music-director': pkg.musicReport,
  }
  return map[agentId]
}

export const useCreativeTeamStore = create<CreativeTeamState>((set, get) => ({
  creativeTeamPackage: null,
  alignmentScore: null,
  agentStates: { ...DEFAULT_AGENT_STATES },
  loading: false,
  error: null,

  loadCreativeTeam: async (projectId) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(
        `/api/director/creative-team?projectId=${encodeURIComponent(projectId)}`
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || res.statusText)
      }
      const data = await res.json()
      const pkg = (data.package as CreativeTeamPackage | null) ?? null
      set({
        creativeTeamPackage: pkg,
        alignmentScore: pkg?.alignmentScore ?? null,
        agentStates: pkg?.agentStates ?? { ...DEFAULT_AGENT_STATES },
        loading: false,
      })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load creative team',
      })
    }
  },

  runCreativeTeam: async (projectId, agentId) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/director/creative-team/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, agentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Creative team run failed')
      const pkg = data.package as CreativeTeamPackage
      set({
        creativeTeamPackage: pkg,
        alignmentScore: data.alignmentScore ?? pkg.alignmentScore,
        agentStates: pkg.agentStates,
        loading: false,
      })

      if (pkg.producerReport?.payload) {
        const { useDirectorStudioStore } = await import('@/stores/director-studio-store')
        const producer = pkg.producerReport.payload as import('@/lib/director/producer/types').ProducerReport
        useDirectorStudioStore.setState({
          producerReport: producer,
          storyReadinessScore: producer.storyReadinessScore,
          producerRecommendations: producer.recommendations,
        })
      }

      if (pkg.screenwriterReport?.payload) {
        const payload = pkg.screenwriterReport.payload as { blueprint?: import('@/lib/director/types').DirectorBlueprint }
        if (payload.blueprint) {
          const { useDirectorStudioStore } = await import('@/stores/director-studio-store')
          useDirectorStudioStore.setState({ blueprint: payload.blueprint })
        }
      }

      if (pkg.cinematographyReport?.payload) {
        const payload = pkg.cinematographyReport.payload as { cameraLanguage?: import('@/lib/director/types').CameraLanguagePlan }
        if (payload.cameraLanguage) {
          const { useDirectorStudioStore } = await import('@/stores/director-studio-store')
          useDirectorStudioStore.setState({ cameraLanguage: payload.cameraLanguage })
        }
      }

      if (pkg.voiceReport?.payload) {
        const payload = pkg.voiceReport.payload as { voiceProfile?: import('@/lib/director/types').VoiceProfile }
        if (payload.voiceProfile) {
          const { useDirectorStudioStore } = await import('@/stores/director-studio-store')
          useDirectorStudioStore.setState({ voiceProfile: payload.voiceProfile })
        }
      }

      if (pkg.musicReport?.payload) {
        const payload = pkg.musicReport.payload as { musicDirection?: import('@/lib/director/types').MusicDirection }
        if (payload.musicDirection) {
          const { useDirectorStudioStore } = await import('@/stores/director-studio-store')
          useDirectorStudioStore.setState({ musicDirection: payload.musicDirection })
        }
      }
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Creative team run failed',
      })
    }
  },

  acceptAgent: async (agentId) => {
    await patchAgentAction(get, set, agentId, 'accept')
  },

  rejectAgent: async (agentId) => {
    await patchAgentAction(get, set, agentId, 'reject')
  },

  regenerateAgent: async (agentId) => {
    await patchAgentAction(get, set, agentId, 'regenerate')
  },

  reset: () =>
    set({
      creativeTeamPackage: null,
      alignmentScore: null,
      agentStates: { ...DEFAULT_AGENT_STATES },
      loading: false,
      error: null,
    }),
}))

async function patchAgentAction(
  get: () => CreativeTeamState,
  set: (partial: Partial<CreativeTeamState>) => void,
  agentId: CreativeTeamAgentId,
  action: 'accept' | 'reject' | 'regenerate'
) {
  const pkg = get().creativeTeamPackage
  if (!pkg?.reportId) {
    set({ error: 'Run creative team first' })
    return
  }
  set({ loading: true, error: null })
  try {
    const res = await fetch('/api/director/creative-team/agent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: pkg.reportId, agentId, action }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Agent action failed')
    const next = data.package as CreativeTeamPackage
    set({
      creativeTeamPackage: next,
      alignmentScore: next.alignmentScore,
      agentStates: next.agentStates,
      loading: false,
    })

    const report = reportForAgent(next, agentId)
    if (action === 'regenerate' && report?.payload) {
      const { useDirectorStudioStore } = await import('@/stores/director-studio-store')
      if (agentId === 'executive-producer') {
        const producer = report.payload as import('@/lib/director/producer/types').ProducerReport
        useDirectorStudioStore.setState({
          producerReport: producer,
          storyReadinessScore: producer.storyReadinessScore,
          producerRecommendations: producer.recommendations,
        })
      }
    }
  } catch (e) {
    set({
      loading: false,
      error: e instanceof Error ? e.message : 'Agent action failed',
    })
  }
}
