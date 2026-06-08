'use client'

import { create } from 'zustand'
import type { VirloMarketIntelligence } from '@/lib/virlo/types'

type VirloIntelligenceState = {
  market: VirloMarketIntelligence | null
  loading: boolean
  error: string | null
  loadMarket: (platform?: string | null) => Promise<void>
  reset: () => void
}

const initialState = {
  market: null as VirloMarketIntelligence | null,
  loading: false,
  error: null as string | null,
}

export const useVirloIntelligenceStore = create<VirloIntelligenceState>((set) => ({
  ...initialState,

  loadMarket: async (platform) => {
    set({ loading: true, error: null })
    try {
      const qs = platform ? `?platform=${encodeURIComponent(platform)}` : ''
      const res = await fetch(`/api/director/virlo/market${qs}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || res.statusText)
      }
      const data = await res.json()
      set({ market: data.market ?? null, loading: false })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load Virlo market data',
      })
    }
  },

  reset: () => set({ ...initialState }),
}))
