export type UnifiedProjectPipeline =
  | 'v7'
  | 'quick_cut'
  | 'cinematic'
  | 'v3'

export type UnifiedProjectStatus = 'completed' | 'running' | 'paused' | 'failed' | 'draft'

export type UnifiedLibraryStatusFilter =
  | 'all'
  | 'completed'
  | 'running'
  | 'paused'
  | 'failed'
  | 'draft'

export type UnifiedLibraryPipelineFilter =
  | 'all'
  | 'v7'
  | 'quick_cut'
  | 'cinematic'
  | 'v3'

export type UnifiedLibrarySort =
  | 'recently_updated'
  | 'newest'
  | 'oldest'
  | 'recently_completed'

export type UnifiedProjectActions = {
  open: boolean
  continue: boolean
  retry: boolean
  watch: boolean
  download: boolean
  downloadMov: boolean
  creatorPack: boolean
}

export type UnifiedProjectItem = {
  id: string
  title: string
  prompt: string
  type: UnifiedProjectPipeline
  typeLabel: string
  status: UnifiedProjectStatus
  statusLabel: string
  currentStage: string | null
  currentTask: string | null
  progress: number
  pausedReason: string | null
  pausedDetail: string | null
  retryAvailable: boolean
  thumbnailUrl: string | null
  reelUrl: string | null
  movUrl: string | null
  creatorPackUrl: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  route: string
  actions: UnifiedProjectActions
  /** e.g. "Scene 1 / 8" for scene-based V7 stages */
  sceneProgressLabel?: string | null
  /** e.g. "43 sec" when a V7 production is complete */
  durationLabel?: string | null
}

export type UnifiedLibrarySourceHealth = {
  v7: 'ok' | 'error'
  cinematic: 'ok' | 'error'
  v3: 'ok' | 'error'
  errors: string[]
}

export type UnifiedLibraryStats = {
  total: number
  v7: number
  quickCut: number
  cinematic: number
  v3: number
  completed: number
  running: number
  paused: number
  failed: number
  draft: number
}

export type UnifiedLibraryResponse = {
  ok: true
  projects: UnifiedProjectItem[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
  stats: UnifiedLibraryStats
  sources: UnifiedLibrarySourceHealth
}
