/** Hook and storyboard version tracking within a single project session. */

export type HookVersion = {
  id: string
  text: string
  label: string
  createdAt: string
}

export type StoryboardVersion = {
  id: string
  sceneId: string
  sceneTitle: string
  imageUrl: string
  label: string
  createdAt: string
}

export type VariationHistory = {
  hooks: HookVersion[]
  selectedHookId: string | null
  storyboards: StoryboardVersion[]
  /** sceneId → selected storyboard version id */
  selectedStoryboardByScene: Record<string, string>
}

export function emptyVariationHistory(): VariationHistory {
  return {
    hooks: [],
    selectedHookId: null,
    storyboards: [],
    selectedStoryboardByScene: {},
  }
}

export function hookVersionLabel(index: number): string {
  return `V${index + 1}`
}

export function storyboardVersionLabel(index: number): string {
  return `V${index + 1}`
}

export function appendHookVersion(
  history: VariationHistory,
  text: string,
  opts?: { select?: boolean }
): VariationHistory {
  const trimmed = text.trim()
  if (!trimmed) return history

  const duplicate = history.hooks.find((h) => h.text.trim() === trimmed)
  if (duplicate) {
    return opts?.select
      ? { ...history, selectedHookId: duplicate.id }
      : history
  }

  const id = `hook-${history.hooks.length + 1}-${Date.now()}`
  const version: HookVersion = {
    id,
    text: trimmed,
    label: hookVersionLabel(history.hooks.length),
    createdAt: new Date().toISOString(),
  }

  return {
    ...history,
    hooks: [...history.hooks, version],
    selectedHookId: opts?.select !== false ? id : history.selectedHookId,
  }
}

export function selectHookVersion(
  history: VariationHistory,
  versionId: string
): VariationHistory {
  if (!history.hooks.some((h) => h.id === versionId)) return history
  return { ...history, selectedHookId: versionId }
}

export function selectedHookText(history: VariationHistory, fallback = ''): string {
  const selected = history.hooks.find((h) => h.id === history.selectedHookId)
  return selected?.text ?? history.hooks[history.hooks.length - 1]?.text ?? fallback
}

export function appendStoryboardVersion(
  history: VariationHistory,
  input: {
    sceneId: string
    sceneTitle: string
    imageUrl: string
    select?: boolean
  }
): VariationHistory {
  const url = input.imageUrl.trim()
  if (!url) return history

  const sceneVersions = history.storyboards.filter((s) => s.sceneId === input.sceneId)
  const id = `sb-${input.sceneId}-${sceneVersions.length + 1}-${Date.now()}`
  const version: StoryboardVersion = {
    id,
    sceneId: input.sceneId,
    sceneTitle: input.sceneTitle,
    imageUrl: url,
    label: storyboardVersionLabel(sceneVersions.length),
    createdAt: new Date().toISOString(),
  }

  return {
    ...history,
    storyboards: [...history.storyboards, version],
    selectedStoryboardByScene: input.select !== false
      ? { ...history.selectedStoryboardByScene, [input.sceneId]: id }
      : history.selectedStoryboardByScene,
  }
}

export function selectStoryboardVersion(
  history: VariationHistory,
  versionId: string
): VariationHistory {
  const version = history.storyboards.find((s) => s.id === versionId)
  if (!version) return history
  return {
    ...history,
    selectedStoryboardByScene: {
      ...history.selectedStoryboardByScene,
      [version.sceneId]: versionId,
    },
  }
}

export function parseVariationHistory(raw: unknown): VariationHistory {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyVariationHistory()
  }
  const row = raw as Record<string, unknown>
  const hooks = Array.isArray(row.hooks)
    ? row.hooks
        .filter((h): h is Record<string, unknown> => h && typeof h === 'object')
        .map((h, i) => ({
          id: typeof h.id === 'string' ? h.id : `hook-${i}`,
          text: typeof h.text === 'string' ? h.text : '',
          label: typeof h.label === 'string' ? h.label : hookVersionLabel(i),
          createdAt: typeof h.createdAt === 'string' ? h.createdAt : new Date().toISOString(),
        }))
        .filter((h) => h.text.trim())
    : []

  const storyboards = Array.isArray(row.storyboards)
    ? row.storyboards
        .filter((s): s is Record<string, unknown> => s && typeof s === 'object')
        .map((s, i) => ({
          id: typeof s.id === 'string' ? s.id : `sb-${i}`,
          sceneId: typeof s.sceneId === 'string' ? s.sceneId : '',
          sceneTitle: typeof s.sceneTitle === 'string' ? s.sceneTitle : 'Scene',
          imageUrl: typeof s.imageUrl === 'string' ? s.imageUrl : '',
          label: typeof s.label === 'string' ? s.label : storyboardVersionLabel(i),
          createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
        }))
        .filter((s) => s.sceneId && s.imageUrl.trim())
    : []

  return {
    hooks,
    selectedHookId: typeof row.selectedHookId === 'string' ? row.selectedHookId : hooks.at(-1)?.id ?? null,
    storyboards,
    selectedStoryboardByScene:
      row.selectedStoryboardByScene && typeof row.selectedStoryboardByScene === 'object'
        ? (row.selectedStoryboardByScene as Record<string, string>)
        : {},
  }
}
