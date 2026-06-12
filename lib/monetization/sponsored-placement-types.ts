/** Placement surfaces for native sponsored cards. */
export type SponsoredPlacementType =
  | 'dashboard'
  | 'generation_result'
  | 'empty_state'
  | 'resources'

export type SponsoredPlacement = {
  id: string
  title: string
  description: string
  imageUrl: string | null
  destinationUrl: string
  cta: string
  placementType: SponsoredPlacementType
  active: boolean
  sortOrder: number
  impressions: number
  clicks: number
}

export type SponsoredPlacementInput = {
  title: string
  description: string
  imageUrl?: string | null
  destinationUrl: string
  cta: string
  placementType: SponsoredPlacementType
  active?: boolean
  sortOrder?: number
}

export const PLACEMENT_TYPE_LABELS: Record<SponsoredPlacementType, string> = {
  dashboard: 'Dashboard sidebar',
  generation_result: 'After generation',
  empty_state: 'Empty states',
  resources: 'Resource library',
}

export function isSponsoredPlacementType(value: string): value is SponsoredPlacementType {
  return (
    value === 'dashboard' ||
    value === 'generation_result' ||
    value === 'empty_state' ||
    value === 'resources'
  )
}

export type SponsoredPlacementRow = {
  id: string
  title: string
  description: string
  image_url: string | null
  destination_url: string
  cta: string
  placement_type: string
  active: boolean
  sort_order: number
  impressions: number
  clicks: number
  created_at?: string
  updated_at?: string
}

export function mapSponsoredPlacementRow(row: SponsoredPlacementRow): SponsoredPlacement {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    imageUrl: row.image_url?.trim() || null,
    destinationUrl: row.destination_url,
    cta: row.cta || 'Learn more',
    placementType: row.placement_type as SponsoredPlacementType,
    active: row.active,
    sortOrder: row.sort_order ?? 0,
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
  }
}
