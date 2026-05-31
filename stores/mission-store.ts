'use client'

import { create } from 'zustand'
import type { AchievementId } from '@/lib/mission/achievements'
import type { DailyQuestId } from '@/lib/mission/daily-quests'
import { DEFAULT_MISSION_PROFILE, type MissionProfile } from '@/lib/mission/mission-types'
import type { XpEventType } from '@/lib/mission/xp-config'

export type SessionXpEvent = {
  id: string
  event: XpEventType
  xp: number
  at: number
}

type MissionState = {
  profile: MissionProfile
  profileLoaded: boolean
  sessionXpEvents: SessionXpEvent[]
  sessionAchievements: AchievementId[]
  commentaryIndex: number
  lastAwardedSections: Set<string>
  floatingXp: { amount: number; id: string } | null

  fetchProfile: () => Promise<void>
  awardXp: (
    event: XpEventType | null,
    opts?: { storyScore?: number; incrementProjects?: boolean }
  ) => Promise<void>
  markSectionAwarded: (section: string) => boolean
  resetMissionSession: () => void
  advanceCommentary: () => void
  clearFloatingXp: () => void
  pushSessionAchievement: (id: AchievementId) => void
}

export const useMissionStore = create<MissionState>((set, get) => ({
  profile: { ...DEFAULT_MISSION_PROFILE, stats: { ...DEFAULT_MISSION_PROFILE.stats } },
  profileLoaded: false,
  sessionXpEvents: [],
  sessionAchievements: [],
  commentaryIndex: 0,
  lastAwardedSections: new Set(),
  floatingXp: null,

  fetchProfile: async () => {
    try {
      const res = await fetch('/api/mission/profile', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.mission) {
        set({ profile: data.mission as MissionProfile, profileLoaded: true })
      } else {
        set({ profileLoaded: true })
      }
    } catch {
      set({ profileLoaded: true })
    }
  },

  awardXp: async (event, opts) => {
    if (!event && !opts?.incrementProjects) return
    try {
      const res = await fetch('/api/mission/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: event ?? undefined,
          storyScore: opts?.storyScore,
          incrementProjects: opts?.incrementProjects,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return

      const xpGained = typeof data.xp_gained === 'number' ? data.xp_gained : 0
      const newAchievements = (data.new_achievements ?? []) as AchievementId[]

      set((state) => ({
        profile: (data.mission as MissionProfile) ?? state.profile,
        sessionXpEvents:
          event && xpGained > 0
            ? [
                ...state.sessionXpEvents,
                {
                  id: `${event}-${Date.now()}`,
                  event,
                  xp: xpGained,
                  at: Date.now(),
                },
              ]
            : state.sessionXpEvents,
        sessionAchievements: [...new Set([...state.sessionAchievements, ...newAchievements])],
        floatingXp: xpGained > 0 ? { amount: xpGained, id: `xp-${Date.now()}` } : null,
      }))
    } catch {
      /* non-blocking */
    }
  },

  markSectionAwarded: (section) => {
    const { lastAwardedSections } = get()
    if (lastAwardedSections.has(section)) return false
    const next = new Set(lastAwardedSections)
    next.add(section)
    set({ lastAwardedSections: next })
    return true
  },

  resetMissionSession: () => {
    set({
      lastAwardedSections: new Set(),
      sessionXpEvents: [],
      commentaryIndex: 0,
      floatingXp: null,
    })
  },

  advanceCommentary: () => {
    set((s) => ({ commentaryIndex: s.commentaryIndex + 1 }))
  },

  clearFloatingXp: () => set({ floatingXp: null }),

  pushSessionAchievement: (id) => {
    set((s) => ({
      sessionAchievements: s.sessionAchievements.includes(id)
        ? s.sessionAchievements
        : [...s.sessionAchievements, id],
    }))
  },
}))

export type { DailyQuestId }
