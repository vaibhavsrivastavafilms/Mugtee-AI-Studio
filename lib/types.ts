export type ContentStatus = 'idea' | 'scripting' | 'shooting' | 'editing' | 'scheduled' | 'published'
export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'linkedin' | 'facebook' | 'reddit'
export type CrewStatus = 'active' | 'busy' | 'offline'
export type ShootStatus = 'planned' | 'today' | 'wrapped'
export type MediaType = 'image' | 'video' | 'audio'

export interface ContentPiece {
  id: string
  user_id?: string
  title: string
  description?: string | null
  status: ContentStatus
  platform: Platform
  thumbnail?: string | null
  scheduled_at?: string | null
  due_date?: string | null
  assignee?: string | null
  tags?: string[] | null
  script?: string | null
  script_due_date?: string | null
  shoot_date?: string | null
  edit_due_date?: string | null
  created_at?: string
  updated_at?: string
}

export interface CrewMember {
  id: string
  user_id?: string
  name: string
  role?: string | null
  email?: string | null
  avatar_url?: string | null
  status?: CrewStatus | null
  created_at?: string
}

export interface Shoot {
  id: string
  user_id?: string
  title: string
  date?: string | null
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  crew_ids?: string[] | null
  status?: ShootStatus | null
  notes?: string | null
  created_at?: string
}

export interface MediaAsset {
  id: string
  user_id?: string
  title: string
  type?: MediaType | null
  url?: string | null
  thumbnail?: string | null
  size_bytes?: number | null
  content_id?: string | null
  created_at?: string
}

export interface ActivityItem {
  id: string
  user_id?: string
  actor?: string | null
  action?: string | null
  target?: string | null
  created_at?: string
}
