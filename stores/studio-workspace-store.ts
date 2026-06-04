'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkspaceStage } from '@/lib/studio/workspace-stages'

export type ContextSectionId = 'project' | 'director' | 'system' | 'export'

export type PanelPreferences = {
  directorPanelOpen: boolean
  sidebarCollapsed: boolean
  continuityExpanded: boolean
  styleLibraryCollapsed: boolean
  directorNotesExpanded: boolean
  contextSections: Record<ContextSectionId, boolean>
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
  setContextSectionExpanded: (section: ContextSectionId, expanded: boolean) => void
  setTargetPlatform: (platform: WorkspaceTargetPlatform) => void
  resetForProject: (stage?: WorkspaceStage) => void
}

export const DEFAULT_CONTEXT_SECTIONS: Record<ContextSectionId, boolean> = {
  project: true,
  director: false,
  system: false,
  export: false,
}

const DEFAULT_PANEL_PREFERENCES: PanelPreferences = {
  directorPanelOpen: true,
  sidebarCollapsed: false,
  continuityExpanded: false,
  styleLibraryCollapsed: true,
  directorNotesExpanded: false,
  contextSections: DEFAULT_CONTEXT_SECTIONS,
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
      setContextSectionExpanded: (section, expanded) =>
        set((state) => ({
          panelPreferences: {
            ...state.panelPreferences,
            contextSections: {
              ...state.panelPreferences.contextSections,
              [section]: expanded,
            },
          },
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
      merge: (persisted, current) => {
        const p = persisted as Partial<StudioWorkspaceState> | undefined
        if (!p?.panelPreferences) return current
        return {
          ...current,
          ...p,
          panelPreferences: {
            ...DEFAULT_PANEL_PREFERENCES,
            ...p.panelPreferences,
            contextSections: {
              ...DEFAULT_CONTEXT_SECTIONS,
              ...p.panelPreferences?.contextSections,
            },
          },
        }
      },
    }
  )
)
