import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { StoryDirectorPackage } from '@/lib/ai/director/story-director-engine'
import type {
  ActiveStoryFramework,
  FrameworkAnalysis,
  StoryFrameworkRecommendation,
} from '@/lib/director/framework-types'
import type {
  CameraLanguagePlan,
  CharacterBible,
  DirectorBlueprint,
  DirectorStageProgress,
  DirectorTreatment,
  MotionPlan,
  MusicDirection,
  StoryDirectionOption,
  StoryboardPlan,
  VoiceProfile,
} from '@/lib/director/types'
import {
  normalizeDirectorTreatment,
} from '@/lib/director/director-treatment'
import { STORY_FRAMEWORKS } from '@/lib/ai/prompts/director/story-frameworks'
import type { ContentAngleId } from '@/lib/cinematic/content-angle-engine'

export async function verifyDirectorProject(projectId: string, userId: string) {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('cinematic_projects')
    .select('id, user_id, title, prompt, script, scenes')
    .eq('id', projectId)
    .single()
  if (error || !data || data.user_id !== userId) return null
  return data
}

export type DirectorStudioSnapshot = {
  storyDirections: {
    topic: string
    options: StoryDirectionOption[]
    selectedId: string | null
    activeStoryDirection: StoryDirectionOption | null
  }
  directorTreatment: DirectorTreatment | null
  characterBible: CharacterBible | null
  cameraLanguage: CameraLanguagePlan | null
  voiceProfile: VoiceProfile | null
  musicDirection: MusicDirection | null
  motionPlan: MotionPlan | null
  projectState: {
    directorApproved: boolean
    blueprintLocked: boolean
    stageProgress: DirectorStageProgress
    blueprint: DirectorBlueprint | null
    storyboardPlan: StoryboardPlan | null
    storyDirectorPackage: StoryDirectorPackage | null
    frameworkRecommendations: StoryFrameworkRecommendation[]
    activeFramework: ActiveStoryFramework | null
    frameworkAnalysis: FrameworkAnalysis | null
  }
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback
  return raw as T
}

export async function loadDirectorStudioSnapshot(
  projectId: string,
  userId: string
): Promise<DirectorStudioSnapshot | null> {
  const project = await verifyDirectorProject(projectId, userId)
  if (!project) return null

  const supabase = createSupabaseServerClient()
  const [
    storyRes,
    treatmentRes,
    bibleRes,
    cameraRes,
    voiceRes,
    musicRes,
    motionRes,
    stateRes,
    frameworkRes,
  ] = await Promise.all([
    supabase.from('story_directions').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('director_treatments').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('character_bibles').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('camera_profiles').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('voice_profiles').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('music_profiles').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('motion_plans').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('director_project_state').select('*').eq('project_id', projectId).maybeSingle(),
    supabase
      .from('story_frameworks')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .maybeSingle(),
  ])

  const storyRow = storyRes.data
  const options = parseJson<StoryDirectionOption[]>(storyRow?.options, [])
  const active = parseJson<StoryDirectionOption | null>(
    storyRow?.active_story_direction,
    null
  )

  return {
    storyDirections: {
      topic: storyRow?.topic ?? project.prompt ?? '',
      options,
      selectedId: storyRow?.selected_id ?? null,
      activeStoryDirection: active,
    },
    directorTreatment: treatmentRes.data?.payload
      ? normalizeDirectorTreatment(treatmentRes.data.payload)
      : null,
    characterBible: parseJson<CharacterBible | null>(bibleRes.data?.payload, null),
    cameraLanguage: parseJson<CameraLanguagePlan | null>(
      cameraRes.data?.camera_language,
      null
    ),
    voiceProfile: parseJson<VoiceProfile | null>(voiceRes.data?.payload, null),
    musicDirection: parseJson<MusicDirection | null>(musicRes.data?.payload, null),
    motionPlan: parseJson<MotionPlan | null>(motionRes.data?.payload, null),
    projectState: {
      directorApproved: stateRes.data?.director_approved ?? false,
      blueprintLocked: stateRes.data?.blueprint_locked ?? false,
      stageProgress: parseJson<DirectorStageProgress>(stateRes.data?.stage_progress, {}),
      blueprint: parseJson<DirectorBlueprint | null>(stateRes.data?.blueprint, null),
      storyboardPlan: parseJson<StoryboardPlan | null>(stateRes.data?.storyboard_plan, null),
      storyDirectorPackage: parseJson<StoryDirectorPackage | null>(
        stateRes.data?.story_director_package,
        null
      ),
      frameworkRecommendations: parseJson<StoryFrameworkRecommendation[]>(
        stateRes.data?.framework_recommendations,
        []
      ),
      activeFramework: frameworkRowToActive(frameworkRes.data),
      frameworkAnalysis: parseJson<FrameworkAnalysis | null>(
        stateRes.data?.framework_analysis,
        null
      ),
    },
  }
}

function frameworkRowToActive(row: Record<string, unknown> | null): ActiveStoryFramework | null {
  if (!row || typeof row.framework_name !== 'string') return null
  const frameworkName = row.framework_name as ActiveStoryFramework['frameworkName']
  const fw = STORY_FRAMEWORKS[frameworkName]
  return {
    id: String(row.id),
    framework: frameworkName,
    frameworkName,
    title: fw?.label ?? String(row.framework_name),
    coreEmotion: String(row.core_emotion ?? ''),
    audienceDesire: String(row.audience_desire ?? ''),
    narrativeTension: String(row.narrative_tension ?? ''),
    curiosityGap: String(row.curiosity_gap ?? ''),
    transformation: String(row.transformation ?? ''),
    confidenceScore: Number(row.confidence_score ?? 0),
    selectedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    viralityScore: row.virality_score != null ? Number(row.virality_score) : null,
    retentionScore: row.retention_score != null ? Number(row.retention_score) : null,
    shareabilityScore: row.shareability_score != null ? Number(row.shareability_score) : null,
    saveabilityScore: row.saveability_score != null ? Number(row.saveability_score) : null,
  }
}

export async function upsertStoryDirections(
  projectId: string,
  userId: string,
  patch: {
    topic?: string
    options?: StoryDirectionOption[]
    selectedId?: string | null
    activeStoryDirection?: StoryDirectionOption | null
  }
) {
  const supabase = createSupabaseServerClient()
  const row = {
    project_id: projectId,
    user_id: userId,
    topic: patch.topic ?? '',
    options: patch.options ?? [],
    selected_id: patch.selectedId ?? null,
    active_story_direction: patch.activeStoryDirection ?? null,
    updated_at: new Date().toISOString(),
  }
  return supabase.from('story_directions').upsert(row, { onConflict: 'project_id' })
}

export async function upsertDirectorTreatment(
  projectId: string,
  userId: string,
  payload: DirectorTreatment
) {
  const supabase = createSupabaseServerClient()
  return supabase.from('director_treatments').upsert(
    {
      project_id: projectId,
      user_id: userId,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id' }
  )
}

export async function upsertDirectorProjectState(
  projectId: string,
  userId: string,
  patch: Partial<{
    directorApproved: boolean
    blueprintLocked: boolean
    stageProgress: DirectorStageProgress
    blueprint: DirectorBlueprint | null
    storyboardPlan: StoryboardPlan | null
    storyDirectorPackage: StoryDirectorPackage | null
    frameworkRecommendations: StoryFrameworkRecommendation[]
    activeFrameworkId: string | null
    frameworkAnalysis: FrameworkAnalysis | null
  }>
) {
  const supabase = createSupabaseServerClient()
  const existing = await supabase
    .from('director_project_state')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  const prev = existing.data
  const row = {
    project_id: projectId,
    user_id: userId,
    director_approved: patch.directorApproved ?? prev?.director_approved ?? false,
    blueprint_locked: patch.blueprintLocked ?? prev?.blueprint_locked ?? false,
    stage_progress: patch.stageProgress ?? prev?.stage_progress ?? {},
    blueprint: patch.blueprint !== undefined ? patch.blueprint : prev?.blueprint ?? null,
    storyboard_plan:
      patch.storyboardPlan !== undefined ? patch.storyboardPlan : prev?.storyboard_plan ?? null,
    story_director_package:
      patch.storyDirectorPackage !== undefined
        ? patch.storyDirectorPackage
        : prev?.story_director_package ?? null,
    framework_recommendations:
      patch.frameworkRecommendations !== undefined
        ? patch.frameworkRecommendations
        : prev?.framework_recommendations ?? [],
    active_framework_id:
      patch.activeFrameworkId !== undefined
        ? patch.activeFrameworkId
        : prev?.active_framework_id ?? null,
    framework_analysis:
      patch.frameworkAnalysis !== undefined
        ? patch.frameworkAnalysis
        : prev?.framework_analysis ?? null,
    updated_at: new Date().toISOString(),
  }
  return supabase.from('director_project_state').upsert(row, { onConflict: 'project_id' })
}

export async function upsertActiveStoryFramework(
  projectId: string,
  userId: string,
  rec: StoryFrameworkRecommendation
) {
  const supabase = createSupabaseServerClient()
  await supabase
    .from('story_frameworks')
    .update({ is_active: false })
    .eq('project_id', projectId)

  const row = {
    project_id: projectId,
    user_id: userId,
    framework_name: rec.framework,
    core_emotion: rec.coreEmotion,
    audience_desire: rec.audienceDesire,
    narrative_tension: rec.narrativeTension,
    curiosity_gap: rec.curiosityGap,
    transformation: rec.transformation,
    confidence_score: rec.confidenceScore,
    is_active: true,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('story_frameworks')
    .insert(row)
    .select('*')
    .single()

  return { data, error }
}

export async function upsertCharacterBible(
  projectId: string,
  userId: string,
  payload: CharacterBible
) {
  const supabase = createSupabaseServerClient()
  return supabase.from('character_bibles').upsert(
    { project_id: projectId, user_id: userId, payload, updated_at: new Date().toISOString() },
    { onConflict: 'project_id' }
  )
}

export async function upsertCameraProfile(
  projectId: string,
  userId: string,
  cameraLanguage: CameraLanguagePlan
) {
  const supabase = createSupabaseServerClient()
  return supabase.from('camera_profiles').upsert(
    {
      project_id: projectId,
      user_id: userId,
      camera_language: cameraLanguage,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id' }
  )
}

export async function upsertVoiceProfile(
  projectId: string,
  userId: string,
  payload: VoiceProfile
) {
  const supabase = createSupabaseServerClient()
  return supabase.from('voice_profiles').upsert(
    { project_id: projectId, user_id: userId, payload, updated_at: new Date().toISOString() },
    { onConflict: 'project_id' }
  )
}

export async function upsertMusicProfile(
  projectId: string,
  userId: string,
  payload: MusicDirection
) {
  const supabase = createSupabaseServerClient()
  return supabase.from('music_profiles').upsert(
    { project_id: projectId, user_id: userId, payload, updated_at: new Date().toISOString() },
    { onConflict: 'project_id' }
  )
}

export async function upsertMotionPlan(
  projectId: string,
  userId: string,
  payload: MotionPlan
) {
  const supabase = createSupabaseServerClient()
  return supabase.from('motion_plans').upsert(
    { project_id: projectId, user_id: userId, payload, updated_at: new Date().toISOString() },
    { onConflict: 'project_id' }
  )
}

export function usedAngleIdsFromOptions(options: StoryDirectionOption[]): ContentAngleId[] {
  return options.map((o) => o.angleId)
}
