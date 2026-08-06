import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import type {
  CharacterDocument,
  CharacterProfile,
  CinematicStyle,
  LocationDocument,
  ProductionPlan,
  ScriptDocument,
  StoryboardDocument,
  V3CharacterRow,
  V3JobRow,
  V3LocationRow,
  V3ProjectRow,
  V3ProjectSnapshot,
  V3SceneImageRow,
  V3ScenePromptRow,
  V3SceneRow,
  V3SceneVideoRow,
} from '@/types/v3/production'
import { buildTimelineFromJobs } from '@/lib/v3/constants'

export async function insertV3Project(
  supabase: SupabaseServerClient,
  params: { userId: string; prompt: string; title?: string }
): Promise<V3ProjectRow> {
  const title =
    params.title?.trim() ||
    params.prompt.trim().slice(0, 80) ||
    'Untitled production'

  const { data, error } = await supabase
    .from('v3_projects')
    .insert({
      user_id: params.userId,
      prompt: params.prompt.trim(),
      title,
      status: 'draft',
      current_stage: 'understanding',
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create V3 project')
  }

  return data as V3ProjectRow
}

export async function deleteV3Project(
  supabase: SupabaseServerClient,
  projectId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('v3_projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

export async function updateV3Project(
  supabase: SupabaseServerClient,
  projectId: string,
  userId: string,
  patch: Partial<{
    title: string
    status: V3ProjectRow['status']
    production_plan: ProductionPlan
    cinematic_style: CinematicStyle
    current_stage: string | null
    voice_url: string | null
    music_url: string | null
    captions_json: Record<string, unknown>[] | unknown
    timeline_json: Record<string, unknown> | null
    reel_url: string | null
    export_status: V3ProjectRow['export_status']
  }>
): Promise<V3ProjectRow> {
  const { data, error } = await supabase
    .from('v3_projects')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update V3 project')
  }

  return data as V3ProjectRow
}

export async function getV3Project(
  supabase: SupabaseServerClient,
  projectId: string,
  userId: string
): Promise<V3ProjectSnapshot | null> {
  const { data: project, error: projectError } = await supabase
    .from('v3_projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (projectError || !project) return null

  const { data: jobs, error: jobsError } = await supabase
    .from('v3_jobs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (jobsError) {
    throw new Error(jobsError.message)
  }

  const row = project as V3ProjectRow
  const jobRows = (jobs ?? []) as V3JobRow[]
  const scenes = await listV3Scenes(supabase, projectId)
  const characters = await listV3Characters(supabase, projectId)
  const locations = await listV3Locations(supabase, projectId)
  const scenePrompts = await listV3ScenePrompts(supabase, projectId)
  const sceneImages = await listV3SceneImages(supabase, projectId)
  const sceneVideos = await listV3SceneVideos(supabase, projectId)

  return {
    project: row,
    jobs: jobRows,
    scenes,
    characters,
    locations,
    scenePrompts,
    sceneImages,
    sceneVideos,
    timeline: buildTimelineFromJobs(jobRows, row.current_stage),
  }
}

export async function listV3Projects(
  supabase: SupabaseServerClient,
  userId: string
): Promise<V3ProjectRow[]> {
  const { data, error } = await supabase
    .from('v3_projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data ?? []) as V3ProjectRow[]
}

export async function listV3Scenes(
  supabase: SupabaseServerClient,
  projectId: string
): Promise<V3SceneRow[]> {
  const { data, error } = await supabase
    .from('v3_scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('number', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    ...(row as V3SceneRow),
    character_ids: Array.isArray((row as V3SceneRow).character_ids)
      ? ((row as V3SceneRow).character_ids as string[])
      : [],
  }))
}

export async function replaceV3ScenesFromScript(
  supabase: SupabaseServerClient,
  projectId: string,
  script: ScriptDocument
): Promise<V3SceneRow[]> {
  await supabase.from('v3_scenes').delete().eq('project_id', projectId)

  const rows = script.scenes.map((scene) => ({
    project_id: projectId,
    number: scene.number,
    script: scene,
    storyboard: {},
    duration: scene.duration,
    character_ids: [],
  }))

  const { data, error } = await supabase.from('v3_scenes').insert(rows).select('*')
  if (error || !data) throw new Error(error?.message ?? 'Failed to save script scenes')
  return data as V3SceneRow[]
}

export async function applyStoryboardToScenes(
  supabase: SupabaseServerClient,
  projectId: string,
  storyboard: StoryboardDocument
): Promise<V3SceneRow[]> {
  const scenes = await listV3Scenes(supabase, projectId)
  const byNumber = new Map(storyboard.scenes.map((s) => [s.number, s]))

  for (const scene of scenes) {
    const board = byNumber.get(scene.number)
    if (!board) continue

    const shotDuration = board.shots.reduce((sum, shot) => sum + shot.duration, 0)
    const { error } = await supabase
      .from('v3_scenes')
      .update({
        storyboard: board,
        duration: shotDuration > 0 ? shotDuration : scene.duration,
      })
      .eq('id', scene.id)

    if (error) throw new Error(error.message)
  }

  return listV3Scenes(supabase, projectId)
}

export async function listV3Characters(
  supabase: SupabaseServerClient,
  projectId: string
): Promise<V3CharacterRow[]> {
  const { data, error } = await supabase
    .from('v3_characters')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as V3CharacterRow[]
}

export async function replaceV3Characters(
  supabase: SupabaseServerClient,
  projectId: string,
  document: CharacterDocument,
  referenceImages: Record<string, string | null>
): Promise<V3CharacterRow[]> {
  await supabase.from('v3_characters').delete().eq('project_id', projectId)

  if (document.characters.length === 0) return []

  const rows = document.characters.map((character: CharacterProfile) => ({
    project_id: projectId,
    name: character.name,
    appearance_json: character,
    seed: character.seed,
    reference_image: referenceImages[character.characterId] ?? null,
  }))

  const { data, error } = await supabase.from('v3_characters').insert(rows).select('*')
  if (error || !data) throw new Error(error?.message ?? 'Failed to save characters')
  return data as V3CharacterRow[]
}

export async function applyCharacterIdsToScenes(
  supabase: SupabaseServerClient,
  projectId: string,
  document: CharacterDocument,
  characterRows: V3CharacterRow[]
): Promise<void> {
  if (document.characters.length === 0) return

  const idByKey = new Map<string, string>()
  for (const row of characterRows) {
    const profile = row.appearance_json as CharacterProfile
    if (profile?.characterId) idByKey.set(profile.characterId, row.id)
  }

  const scenes = await listV3Scenes(supabase, projectId)
  for (const scene of scenes) {
    const characterIds = document.characters
      .filter((c) => c.sceneNumbers.includes(scene.number))
      .map((c) => idByKey.get(c.characterId))
      .filter((id): id is string => Boolean(id))

    await supabase.from('v3_scenes').update({ character_ids: characterIds }).eq('id', scene.id)
  }
}

export async function listV3Locations(
  supabase: SupabaseServerClient,
  projectId: string
): Promise<V3LocationRow[]> {
  const { data, error } = await supabase
    .from('v3_locations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as V3LocationRow[]
}

export async function replaceV3Locations(
  supabase: SupabaseServerClient,
  projectId: string,
  document: LocationDocument
): Promise<V3LocationRow[]> {
  await supabase.from('v3_locations').delete().eq('project_id', projectId)

  const rows = document.locations.map((location) => ({
    project_id: projectId,
    location_key: location.locationId,
    name: location.name,
    profile: location,
  }))

  const { data, error } = await supabase.from('v3_locations').insert(rows).select('*')
  if (error || !data) throw new Error(error?.message ?? 'Failed to save locations')
  return data as V3LocationRow[]
}

export async function applyLocationsToScenes(
  supabase: SupabaseServerClient,
  projectId: string,
  document: LocationDocument,
  locationRows: V3LocationRow[]
): Promise<void> {
  const idByKey = new Map(locationRows.map((row) => [row.location_key, row.id]))
  const scenes = await listV3Scenes(supabase, projectId)

  for (const scene of scenes) {
    const location = document.locations.find((loc) => loc.sceneNumbers.includes(scene.number))
    const locationId = location ? idByKey.get(location.locationId) ?? null : null
    await supabase.from('v3_scenes').update({ location_id: locationId }).eq('id', scene.id)
  }
}

export async function listV3ScenePrompts(
  supabase: SupabaseServerClient,
  projectId: string
): Promise<V3ScenePromptRow[]> {
  const { data, error } = await supabase
    .from('v3_scene_prompts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as V3ScenePromptRow[]
}

export async function replaceV3ScenePrompts(
  supabase: SupabaseServerClient,
  projectId: string,
  prompts: Array<{
    sceneId: string
    imagePrompt: string
    videoPrompt: string
    negativePrompt: string
    metadata: Record<string, unknown>
    promptVersion?: number
  }>
): Promise<V3ScenePromptRow[]> {
  await supabase.from('v3_scene_prompts').delete().eq('project_id', projectId)

  if (prompts.length === 0) return []

  const now = new Date().toISOString()
  const rows = prompts.map((prompt) => ({
    project_id: projectId,
    scene_id: prompt.sceneId,
    image_prompt: prompt.imagePrompt,
    video_prompt: prompt.videoPrompt,
    negative_prompt: prompt.negativePrompt,
    prompt_version: prompt.promptVersion ?? 1,
    metadata: prompt.metadata,
    updated_at: now,
  }))

  const { data, error } = await supabase.from('v3_scene_prompts').insert(rows).select('*')
  if (error || !data) throw new Error(error?.message ?? 'Failed to save scene prompts')
  return data as V3ScenePromptRow[]
}

export async function listV3SceneImages(
  supabase: SupabaseServerClient,
  projectId: string
): Promise<V3SceneImageRow[]> {
  const { data, error } = await supabase
    .from('v3_scene_images')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as V3SceneImageRow[]
}

export async function insertV3SceneImage(
  supabase: SupabaseServerClient,
  row: {
    project_id: string
    scene_id: string
    prompt_id?: string | null
    provider: string
    provider_job_id?: string | null
    image_url?: string | null
    thumbnail_url?: string | null
    seed?: number | null
    width?: number | null
    height?: number | null
    generation_time_ms?: number | null
    status: V3SceneImageRow['status']
    metadata?: Record<string, unknown>
  }
): Promise<V3SceneImageRow> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('v3_scene_images')
    .insert({
      ...row,
      metadata: row.metadata ?? {},
      updated_at: now,
    })
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to insert scene image')
  return data as V3SceneImageRow
}

export async function updateV3SceneImage(
  supabase: SupabaseServerClient,
  imageId: string,
  patch: Partial<{
    status: V3SceneImageRow['status']
    image_url: string | null
    thumbnail_url: string | null
    generation_time_ms: number | null
    metadata: Record<string, unknown>
    provider_job_id: string | null
  }>
): Promise<V3SceneImageRow> {
  const { data, error } = await supabase
    .from('v3_scene_images')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', imageId)
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update scene image')
  return data as V3SceneImageRow
}

export function pickLatestSceneImages(images: V3SceneImageRow[]): V3SceneImageRow[] {
  const latest = new Map<string, V3SceneImageRow>()
  for (const image of images) {
    const existing = latest.get(image.scene_id)
    if (!existing) {
      latest.set(image.scene_id, image)
      continue
    }
    if (image.status === 'completed' && existing.status !== 'completed') {
      latest.set(image.scene_id, image)
      continue
    }
    if (image.created_at > existing.created_at && image.status === 'completed') {
      latest.set(image.scene_id, image)
    }
  }
  return Array.from(latest.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export async function listV3SceneVideos(
  supabase: SupabaseServerClient,
  projectId: string
): Promise<V3SceneVideoRow[]> {
  const { data, error } = await supabase
    .from('v3_scene_videos')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as V3SceneVideoRow[]
}

export async function insertV3SceneVideo(
  supabase: SupabaseServerClient,
  row: {
    project_id: string
    scene_id: string
    image_id?: string | null
    provider: string
    provider_job_id?: string | null
    video_url?: string | null
    thumbnail_url?: string | null
    duration_seconds?: number | null
    fps?: number | null
    resolution?: string | null
    generation_time_ms?: number | null
    status: V3SceneVideoRow['status']
    retry_count?: number
    metadata?: Record<string, unknown>
  }
): Promise<V3SceneVideoRow> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('v3_scene_videos')
    .insert({
      ...row,
      metadata: row.metadata ?? {},
      retry_count: row.retry_count ?? 0,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to insert scene video')
  return data as V3SceneVideoRow
}

export function pickLatestSceneVideos(videos: V3SceneVideoRow[]): V3SceneVideoRow[] {
  const latest = new Map<string, V3SceneVideoRow>()
  for (const video of videos) {
    const existing = latest.get(video.scene_id)
    if (!existing) {
      latest.set(video.scene_id, video)
      continue
    }
    if (video.status === 'completed' && existing.status !== 'completed') {
      latest.set(video.scene_id, video)
      continue
    }
    if (video.created_at > existing.created_at && video.status === 'completed') {
      latest.set(video.scene_id, video)
    }
  }
  return Array.from(latest.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export async function upsertV3Job(
  supabase: SupabaseServerClient,
  params: {
    projectId: string
    agent: V3JobRow['agent']
    status: V3JobRow['status']
    input?: Record<string, unknown> | null
    output?: Record<string, unknown> | null
    error?: string | null
    startedAt?: string | null
    completedAt?: string | null
  }
): Promise<V3JobRow> {
  const now = new Date().toISOString()
  const { data: existing } = await supabase
    .from('v3_jobs')
    .select('id')
    .eq('project_id', params.projectId)
    .eq('agent', params.agent)
    .maybeSingle()

  const payload = {
    project_id: params.projectId,
    agent: params.agent,
    status: params.status,
    input: params.input ?? null,
    output: params.output ?? null,
    error: params.error ?? null,
    started_at: params.startedAt ?? (params.status === 'running' ? now : null),
    completed_at:
      params.completedAt ??
      (params.status === 'completed' || params.status === 'failed' ? now : null),
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('v3_jobs')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Failed to update job')
    return data as V3JobRow
  }

  const { data, error } = await supabase
    .from('v3_jobs')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create job')
  return data as V3JobRow
}
