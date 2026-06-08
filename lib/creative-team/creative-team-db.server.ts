import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type {
  AgentStatesMap,
  CreativeAlignmentScore,
  CreativeTeamPackage,
} from '@/lib/creative-team/types'
import { DEFAULT_AGENT_STATES } from '@/lib/creative-team/types'

type CreativeTeamReportRow = {
  id: string
  project_id: string
  user_id: string
  story_strategy: unknown
  producer_report: unknown
  screenwriter_report: unknown
  cinematography_report: unknown
  voice_report: unknown
  music_report: unknown
  alignment_score: unknown
  agent_states: unknown
  created_at: string
  updated_at: string
}

function parseAgentStates(raw: unknown): AgentStatesMap {
  if (raw && typeof raw === 'object') {
    return { ...DEFAULT_AGENT_STATES, ...(raw as AgentStatesMap) }
  }
  return { ...DEFAULT_AGENT_STATES }
}

function rowToPackage(row: CreativeTeamReportRow): CreativeTeamPackage {
  return {
    reportId: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    storyStrategy: (row.story_strategy as CreativeTeamPackage['storyStrategy']) ?? null,
    producerReport: (row.producer_report as CreativeTeamPackage['producerReport']) ?? null,
    screenwriterReport: (row.screenwriter_report as CreativeTeamPackage['screenwriterReport']) ?? null,
    cinematographyReport:
      (row.cinematography_report as CreativeTeamPackage['cinematographyReport']) ?? null,
    voiceReport: (row.voice_report as CreativeTeamPackage['voiceReport']) ?? null,
    musicReport: (row.music_report as CreativeTeamPackage['musicReport']) ?? null,
    alignmentScore: (row.alignment_score as CreativeAlignmentScore | null) ?? null,
    agentStates: parseAgentStates(row.agent_states),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type CreativeTeamReportUpsert = {
  reportId?: string
} & Omit<CreativeTeamPackage, 'reportId' | 'projectId' | 'userId' | 'createdAt' | 'updatedAt'>

export type CreativeTeamReportPatch = Partial<
  Pick<
    CreativeTeamPackage,
    | 'storyStrategy'
    | 'producerReport'
    | 'screenwriterReport'
    | 'cinematographyReport'
    | 'voiceReport'
    | 'musicReport'
    | 'alignmentScore'
  >
>

function packageToRow(projectId: string, userId: string, input: CreativeTeamReportUpsert) {
  return {
    project_id: projectId,
    user_id: userId,
    story_strategy: input.storyStrategy ?? null,
    producer_report: input.producerReport ?? null,
    screenwriter_report: input.screenwriterReport ?? null,
    cinematography_report: input.cinematographyReport ?? null,
    voice_report: input.voiceReport ?? null,
    music_report: input.musicReport ?? null,
    alignment_score: input.alignmentScore ?? null,
    agent_states: input.agentStates ?? DEFAULT_AGENT_STATES,
    updated_at: new Date().toISOString(),
  }
}

export async function loadCreativeTeamReport(
  projectId: string,
  userId: string
): Promise<CreativeTeamPackage | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('creative_team_reports')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return rowToPackage(data as CreativeTeamReportRow)
}

export async function verifyCreativeTeamReport(
  reportId: string,
  userId: string
): Promise<CreativeTeamPackage | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('creative_team_reports')
    .select('*')
    .eq('id', reportId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return rowToPackage(data as CreativeTeamReportRow)
}

export async function upsertCreativeTeamReport(
  projectId: string,
  userId: string,
  input: CreativeTeamReportUpsert
): Promise<{ data: CreativeTeamPackage | null; error: Error | null }> {
  const supabase = createSupabaseServerClient()
  const row = packageToRow(projectId, userId, input)

  if (input.reportId) {
    const { data, error } = await supabase
      .from('creative_team_reports')
      .update(row)
      .eq('id', input.reportId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) return { data: null, error: new Error(error.message) }
    return { data: rowToPackage(data as CreativeTeamReportRow), error: null }
  }

  const { data, error } = await supabase
    .from('creative_team_reports')
    .upsert(row, { onConflict: 'project_id' })
    .select('*')
    .single()

  if (error) return { data: null, error: new Error(error.message) }
  return { data: rowToPackage(data as CreativeTeamReportRow), error: null }
}

export async function patchCreativeTeamAgentState(
  reportId: string,
  userId: string,
  agentStates: AgentStatesMap,
  patch: CreativeTeamReportPatch
): Promise<{ data: CreativeTeamPackage | null; error: Error | null }> {
  const supabase = createSupabaseServerClient()
  const update: Record<string, unknown> = {
    agent_states: agentStates,
    updated_at: new Date().toISOString(),
  }

  if (patch.storyStrategy !== undefined) update.story_strategy = patch.storyStrategy
  if (patch.producerReport !== undefined) update.producer_report = patch.producerReport
  if (patch.screenwriterReport !== undefined) update.screenwriter_report = patch.screenwriterReport
  if (patch.cinematographyReport !== undefined) update.cinematography_report = patch.cinematographyReport
  if (patch.voiceReport !== undefined) update.voice_report = patch.voiceReport
  if (patch.musicReport !== undefined) update.music_report = patch.musicReport
  if (patch.alignmentScore !== undefined) update.alignment_score = patch.alignmentScore

  const { data, error } = await supabase
    .from('creative_team_reports')
    .update(update)
    .eq('id', reportId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) return { data: null, error: new Error(error.message) }
  return { data: rowToPackage(data as CreativeTeamReportRow), error: null }
}
