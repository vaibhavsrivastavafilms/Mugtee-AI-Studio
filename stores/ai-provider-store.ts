'use client'

import { create } from 'zustand'

export type AITaskKey = 'hook' | 'script' | 'title' | 'caption'

type AIProviderStore = {
  lastProviderByTask: Partial<Record<AITaskKey, string>>
  setLastProvider: (task: AITaskKey, provider: string) => void
  clearProviders: () => void
}

/** Dev display only — tracks which provider handled each task last. */
export const useAIProviderStore = create<AIProviderStore>((set) => ({
  lastProviderByTask: {},
  setLastProvider: (task, provider) =>
    set((state) => ({
      lastProviderByTask: { ...state.lastProviderByTask, [task]: provider },
    })),
  clearProviders: () => set({ lastProviderByTask: {} }),
}))
