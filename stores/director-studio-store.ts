'use client'

import { create } from 'zustand'
import type {
  CameraLanguagePlan,
  CharacterBible,
  DirectorBlueprint,
  DirectorStageProgress,
  DirectorStudioContext,
  DirectorStudioStage,
  DirectorTreatment,
  MotionPlan,
  MusicDirection,
  StoryDirectionOption,
  StoryboardPlan,
  VoiceProfile,
} from '@/lib/director/types'
import type { StoryDirectorPackage } from '@/lib/ai/director/story-director-engine'
import type { StoryFrameworkId } from '@/lib/ai/prompts/director/story-frameworks'
import {
  EMPTY_DIRECTOR_BLUEPRINT,
  EMPTY_DIRECTOR_TREATMENT,
} from '@/lib/director/types'

type DirectorStudioState = {
  projectId: string | null
  topic: string
  activeStage: DirectorStudioStage
  stageProgress: DirectorStageProgress
  storyDirectionOptions: StoryDirectionOption[]
  activeStoryDirection: StoryDirectionOption | null
  directorTreatment: DirectorTreatment
  storyDirectorPackage: StoryDirectorPackage | null
  blueprint: DirectorBlueprint
  characterBible: CharacterBible | null
  cameraLanguage: CameraLanguagePlan | null
  storyboardPlan: StoryboardPlan | null
  voiceProfile: VoiceProfile | null
  musicDirection: MusicDirection | null
  motionPlan: MotionPlan | null
  directorApproved: boolean
  blueprintLocked: boolean
  loading: boolean
  saving: boolean
  error: string | null

  setProjectId: (id: string | null) => void
  setTopic: (topic: string) => void
  setActiveStage: (stage: DirectorStudioStage) => void
  setActiveStoryDirection: (option: StoryDirectionOption | null) => void
  setDirectorTreatment: (t: Partial<DirectorTreatment>) => void
  setStoryDirectorPackage: (pkg: StoryDirectorPackage | null) => void
  setBlueprint: (b: Partial<DirectorBlueprint>) => void
  setCharacterBible: (b: CharacterBible | null) => void
  setCameraLanguage: (c: CameraLanguagePlan | null) => void
  setStoryboardPlan: (p: StoryboardPlan | null) => void
  setVoiceProfile: (v: VoiceProfile | null) => void
  setMusicDirection: (m: MusicDirection | null) => void
  setMotionPlan: (m: MotionPlan | null) => void
  markStageComplete: (stage: DirectorStudioStage) => void

  loadFromServer: (projectId: string) => Promise<void>
  persistPatch: (patch: Record<string, unknown>) => Promise<void>
  generateStoryDirections: () => Promise<void>
  generateTreatment: () => Promise<void>
  generateStoryPackage: (opts?: { userIdea?: string; framework?: StoryFrameworkId | null }) => Promise<void>
  applyStoryPackageToBlueprint: () => Promise<void>
  approveProduction: () => Promise<DirectorStudioContext>
  buildDirectorContext: () => DirectorStudioContext
  reset: () => void
}

const initialState = {
  projectId: null as string | null,
  topic: '',
  activeStage: 'idea' as DirectorStudioStage,
  stageProgress: {} as DirectorStageProgress,
  storyDirectionOptions: [] as StoryDirectionOption[],
  activeStoryDirection: null as StoryDirectionOption | null,
  directorTreatment: { ...EMPTY_DIRECTOR_TREATMENT },
  storyDirectorPackage: null as StoryDirectorPackage | null,
  blueprint: { ...EMPTY_DIRECTOR_BLUEPRINT },
  characterBible: null as CharacterBible | null,
  cameraLanguage: null as CameraLanguagePlan | null,
  storyboardPlan: null as StoryboardPlan | null,
  voiceProfile: null as VoiceProfile | null,
  musicDirection: null as MusicDirection | null,
  motionPlan: null as MotionPlan | null,
  directorApproved: false,
  blueprintLocked: false,
  loading: false,
  saving: false,
  error: null as string | null,
}

export const useDirectorStudioStore = create<DirectorStudioState>((set, get) => ({
  ...initialState,

  setProjectId: (id) => set({ projectId: id }),
  setTopic: (topic) => set({ topic }),
  setActiveStage: (stage) => set({ activeStage: stage }),
  setActiveStoryDirection: (option) =>
    set({ activeStoryDirection: option, stageProgress: { ...get().stageProgress, 'story-direction': 'complete' } }),
  setDirectorTreatment: (t) =>
    set({ directorTreatment: { ...get().directorTreatment, ...t } }),
  setStoryDirectorPackage: (pkg) =>
    set({
      storyDirectorPackage: pkg,
      stageProgress: pkg
        ? { ...get().stageProgress, 'story-package': 'complete' }
        : get().stageProgress,
    }),
  setBlueprint: (b) => set({ blueprint: { ...get().blueprint, ...b } }),
  setCharacterBible: (b) => set({ characterBible: b }),
  setCameraLanguage: (c) => set({ cameraLanguage: c }),
  setStoryboardPlan: (p) => set({ storyboardPlan: p }),
  setVoiceProfile: (v) => set({ voiceProfile: v }),
  setMusicDirection: (m) => set({ musicDirection: m }),
  setMotionPlan: (m) => set({ motionPlan: m }),
  markStageComplete: (stage) =>
    set({
      stageProgress: { ...get().stageProgress, [stage]: 'complete' },
    }),

  buildDirectorContext: () => {
    const s = get()
    return {
      activeStoryDirection: s.activeStoryDirection,
      directorTreatment: s.directorTreatment,
      storyDirectorPackage: s.storyDirectorPackage,
      characterBible: s.characterBible,
      cameraLanguage: s.cameraLanguage,
      storyboardPlan: s.storyboardPlan,
      voiceProfile: s.voiceProfile,
      musicDirection: s.musicDirection,
      motionPlan: s.motionPlan,
      blueprint: s.blueprint,
    }
  },

  loadFromServer: async (projectId) => {
    set({ loading: true, error: null, projectId })
    try {
      const res = await fetch(`/api/director/studio-state?projectId=${encodeURIComponent(projectId)}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || res.statusText)
      }
      const data = await res.json()
      set({
        topic: data.storyDirections?.topic ?? '',
        storyDirectionOptions: data.storyDirections?.options ?? [],
        activeStoryDirection: data.storyDirections?.activeStoryDirection ?? null,
        directorTreatment: data.directorTreatment ?? { ...EMPTY_DIRECTOR_TREATMENT },
        storyDirectorPackage: data.projectState?.storyDirectorPackage ?? null,
        blueprint: data.projectState?.blueprint ?? { ...EMPTY_DIRECTOR_BLUEPRINT },
        characterBible: data.characterBible ?? null,
        cameraLanguage: data.cameraLanguage ?? null,
        storyboardPlan: data.projectState?.storyboardPlan ?? null,
        voiceProfile: data.voiceProfile ?? null,
        musicDirection: data.musicDirection ?? null,
        motionPlan: data.motionPlan ?? null,
        directorApproved: data.projectState?.directorApproved ?? false,
        blueprintLocked: data.projectState?.blueprintLocked ?? false,
        stageProgress: data.projectState?.stageProgress ?? {},
        loading: false,
      })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load director studio',
      })
    }
  },

  persistPatch: async (patch) => {
    const projectId = get().projectId
    if (!projectId) return
    set({ saving: true })
    try {
      await fetch('/api/director/studio-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...patch }),
      })
    } finally {
      set({ saving: false })
    }
  },

  generateStoryDirections: async () => {
    const { projectId, topic } = get()
    if (!projectId || topic.trim().length < 3) {
      set({ error: 'Enter a topic (3+ characters) first' })
      return
    }
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/director/story-directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      set({
        storyDirectionOptions: data.options ?? [],
        loading: false,
        activeStage: 'story-direction',
      })
      await get().persistPatch({
        storyDirections: {
          topic,
          options: data.options,
          selectedId: null,
          activeStoryDirection: null,
        },
      })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Story direction failed',
      })
    }
  },

  generateTreatment: async () => {
    const { projectId, topic, activeStoryDirection } = get()
    if (!projectId) return
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/director/treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, topic, activeStoryDirection }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Treatment failed')
      set({ directorTreatment: data.treatment, loading: false, activeStage: 'director-treatment' })
      await get().persistPatch({ directorTreatment: data.treatment })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Treatment failed',
      })
    }
  },

  generateStoryPackage: async (opts) => {
    const { projectId, topic, storyDirectorPackage } = get()
    const userIdea = (opts?.userIdea ?? topic).trim()
    if (!projectId || userIdea.length < 3) {
      set({ error: 'Enter a topic (3+ characters) first' })
      return
    }
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/director/story-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userIdea,
          framework: opts?.framework ?? storyDirectorPackage?.frameworkId ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Story package generation failed')
      set({
        storyDirectorPackage: data.package,
        loading: false,
        activeStage: 'story-package',
      })
      await get().persistPatch({
        projectState: {
          storyDirectorPackage: data.package,
          stageProgress: { ...get().stageProgress, 'story-package': 'complete' },
        },
      })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Story package failed',
      })
    }
  },

  applyStoryPackageToBlueprint: async () => {
    const pkg = get().storyDirectorPackage
    if (!pkg) return
    const { storyPackageToBlueprint, storyPackageToStoryboardPlan, storyPackageToVoiceProfile, storyPackageToGeneratedScenes } =
      await import('@/lib/director/apply-story-package')
    const blueprint = storyPackageToBlueprint(pkg, get().blueprint)
    const storyboardPlan = storyPackageToStoryboardPlan(pkg)
    const voiceProfile = storyPackageToVoiceProfile(pkg)
    set({
      blueprint,
      storyboardPlan,
      voiceProfile,
      activeStage: 'blueprint',
      stageProgress: {
        ...get().stageProgress,
        blueprint: 'in_progress',
      },
    })
    await get().persistPatch({
      projectState: { blueprint, storyboardPlan },
      voiceProfile,
    })
    const { useQuickCutGenerationStore } = await import('@/stores/quick-cut-generation-store')
    const scenes = storyPackageToGeneratedScenes(pkg)
    useQuickCutGenerationStore.setState({
      hook: blueprint.hook,
      title: blueprint.title,
      script: blueprint.script,
      prompt: get().topic,
      scenes,
      storyboard: scenes,
    })
  },

  approveProduction: async () => {
    const ctx = get().buildDirectorContext()
    set({ directorApproved: true, activeStage: 'generate-assets' })
    await get().persistPatch({
      projectState: {
        directorApproved: true,
        stageProgress: { ...get().stageProgress, 'director-approval': 'complete' },
        blueprint: get().blueprint,
      },
      directorTreatment: get().directorTreatment,
    })
    return ctx
  },

  reset: () => set({ ...initialState }),
}))
