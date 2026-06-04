'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkspaceStage } from '@/lib/studio/workspace-stages'

export type PanelPreferences = {
  directorPanelOpen: boolean
  sidebarCollapsed: boolean
  continuityExpanded: boolean
  styleLibraryCollapsed: boolean
}

/** Target distribution platform for output workspace tone hints. */
export type WorkspaceTargetPlatform = 'youtube' | 'instagram' | 'tiktok'

type StudioWorkspaceState = {
  activeStage: WorkspaceStage
  activeSceneIndex: number
  timelineCollapsed: boolean
  panelPreferences: PanelPreferences
  targetPlatform: WorkspaceTargetPlatform
  setActiveStage: (stage: WorkspaceStage) => void
  setActiveSceneIndex: (index: number) => void
  setTimelineCollapsed: (collapsed: boolean) => void
  setPanelPreferences: (prefs: Partial<PanelPreferences>) => void
  setTargetPlatform: (platform: WorkspaceTargetPlatform) => void
  resetForProject: (stage?: WorkspaceStage) => void
}

const DEFAULT_PANEL_PREFERENCES: PanelPreferences = {
  directorPanelOpen: true,
  sidebarCollapsed: false,
  continuityExpanded: true,
  styleLibraryCollapsed: false,
}

export const useStudioWorkspaceStore = create<StudioWorkspaceState>()(
  persist(
    (set) => ({
      activeStage: 'idea',
      activeSceneIndex: 0,
      timelineCollapsed: false,
      panelPreferences: DEFAULT_PANEL_PREFERENCES,
      targetPlatform: 'instagram',
      setActiveStage: (stage) => set({ activeStage: stage }),
      setActiveSceneIndex: (index) => set({ activeSceneIndex: Math.max(0, index) }),
      setTimelineCollapsed: (collapsed) => set({ timelineCollapsed: collapsed }),
      setPanelPreferences: (prefs) =>
        set((state) => ({
          panelPreferences: { ...state.panelPreferences, ...prefs },
        })),
      setTargetPlatform: (platform) => set({ targetPlatform: platform }),
      resetForProject: (stage = 'idea') =>
        set({
          activeStage: stage,
          activeSceneIndex: 0,
        }),
    }),
    {
      name: 'mugtee-studio-workspace',
      partialize: (state) => ({
        panelPreferences: state.panelPreferences,
        timelineCollapsed: state.timelineCollapsed,
        targetPlatform: state.targetPlatform,
      }),
    }
  )
)
