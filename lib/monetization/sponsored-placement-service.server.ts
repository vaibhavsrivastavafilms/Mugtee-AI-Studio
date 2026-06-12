import { createSupabaseServiceClient } from '@/lib/supabase/service'
import {
  isSponsoredPlacementType,
  mapSponsoredPlacementRow,
  type SponsoredPlacement,
  type SponsoredPlacementInput,
  type SponsoredPlacementRow,
  type SponsoredPlacementType,
} from '@/lib/monetization/sponsored-placement-types'

function db() {
  return createSupabaseServiceClient()
}

export async function listActivePlacements(
  placementType?: SponsoredPlacementType
): Promise<SponsoredPlacement[]> {
  const client = db()
  if (!client) return []

  let query = client
    .from('sponsored_placements')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (placementType) {
    query = query.eq('placement_type', placementType)
  }

  const { data, error } = await query
  if (error || !data) return []

  return (data as SponsoredPlacementRow[])
    .filter((row) => isSponsoredPlacementType(row.placement_type))
    .map(mapSponsoredPlacementRow)
}

export async function listAllPlacementsAdmin(): Promise<SponsoredPlacement[]> {
  const client = db()
  if (!client) return []

  const { data, error } = await client
    .from('sponsored_placements')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as SponsoredPlacementRow[]).map(mapSponsoredPlacementRow)
}

export async function createPlacement(input: SponsoredPlacementInput): Promise<SponsoredPlacement | null> {
  const client = db()
  if (!client) return null

  const { data, error } = await client
    .from('sponsored_placements')
    .insert({
      title: input.title.trim(),
      description: input.description.trim(),
      image_url: input.imageUrl?.trim() || null,
      destination_url: input.destinationUrl.trim(),
      cta: input.cta.trim() || 'Learn more',
      placement_type: input.placementType,
      active: input.active ?? true,
      sort_order: input.sortOrder ?? 0,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error || !data) return null
  return mapSponsoredPlacementRow(data as SponsoredPlacementRow)
}

export async function updatePlacement(
  id: string,
  input: Partial<SponsoredPlacementInput>
): Promise<SponsoredPlacement | null> {
  const client = db()
  if (!client) return null

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.title != null) patch.title = input.title.trim()
  if (input.description != null) patch.description = input.description.trim()
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl?.trim() || null
  if (input.destinationUrl != null) patch.destination_url = input.destinationUrl.trim()
  if (input.cta != null) patch.cta = input.cta.trim()
  if (input.placementType != null) patch.placement_type = input.placementType
  if (input.active != null) patch.active = input.active
  if (input.sortOrder != null) patch.sort_order = input.sortOrder

  const { data, error } = await client
    .from('sponsored_placements')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) return null
  return mapSponsoredPlacementRow(data as SponsoredPlacementRow)
}

export async function deletePlacement(id: string): Promise<boolean> {
  const client = db()
  if (!client) return false
  const { error } = await client.from('sponsored_placements').delete().eq('id', id)
  return !error
}

export async function recordPlacementEvent(input: {
  placementId: string
  eventType: 'impression' | 'click'
  userId?: string | null
  sessionId?: string | null
  pagePath?: string | null
}): Promise<boolean> {
  const client = db()
  if (!client) return false

  const { error: eventError } = await client.from('sponsored_placement_events').insert({
    placement_id: input.placementId,
    event_type: input.eventType,
    user_id: input.userId ?? null,
    session_id: input.sessionId ?? null,
    page_path: input.pagePath ?? null,
  })

  if (eventError) return false

  const column = input.eventType === 'click' ? 'clicks' : 'impressions'
  const { data: row } = await client
    .from('sponsored_placements')
    .select(column)
    .eq('id', input.placementId)
    .maybeSingle()

  const current = Number((row as Record<string, number> | null)?.[column] ?? 0)
  await client
    .from('sponsored_placements')
    .update({ [column]: current + 1, updated_at: new Date().toISOString() })
    .eq('id', input.placementId)

  return true
}

export type PlacementAnalyticsRow = {
  id: string
  title: string
  placementType: SponsoredPlacementType
  active: boolean
  impressions: number
  clicks: number
  ctr: number
}

export async function getPlacementAnalytics(): Promise<PlacementAnalyticsRow[]> {
  const client = db()
  if (!client) return []

  const { data, error } = await client
    .from('sponsored_placements')
    .select('id, title, placement_type, active, impressions, clicks')
    .order('impressions', { ascending: false })

  if (error || !data) return []

  return (data as SponsoredPlacementRow[]).map((row) => {
    const impressions = Number(row.impressions ?? 0)
    const clicks = Number(row.clicks ?? 0)
    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0
    return {
      id: row.id,
      title: row.title,
      placementType: row.placement_type as SponsoredPlacementType,
      active: row.active,
      impressions,
      clicks,
      ctr,
    }
  })
}
