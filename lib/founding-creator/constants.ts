export const FOUNDING_PLATFORMS = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'other', label: 'Other' },
] as const

export const FOUNDING_CREATOR_TYPES = [
  { id: 'faceless', label: 'Faceless Creator' },
  { id: 'storyteller', label: 'Storyteller' },
  { id: 'documentary', label: 'Documentary Creator' },
  { id: 'personal_brand', label: 'Personal Brand' },
  { id: 'agency', label: 'Agency' },
  { id: 'other', label: 'Other' },
] as const

export const FOUNDING_CONTENT_VOLUMES = [
  { id: '1-10', label: '1–10' },
  { id: '10-30', label: '10–30' },
  { id: '30-100', label: '30–100' },
  { id: '100+', label: '100+' },
] as const

export type FoundingPlatform = (typeof FOUNDING_PLATFORMS)[number]['id']
export type FoundingCreatorType = (typeof FOUNDING_CREATOR_TYPES)[number]['id']
export type FoundingContentVolume = (typeof FOUNDING_CONTENT_VOLUMES)[number]['id']
