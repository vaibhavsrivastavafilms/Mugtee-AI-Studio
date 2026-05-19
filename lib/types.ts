export type ContentStatus = 'idea' | 'scripting' | 'shooting' | 'editing' | 'scheduled' | 'published'
export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'linkedin'

export interface ContentPiece {
  id: string
  title: string
  description?: string
  status: ContentStatus
  platform: Platform
  thumbnail?: string
  scheduled_at?: string | null
  due_date?: string | null
  assignee?: string
  tags?: string[]
  created_at?: string
}

export interface CrewMember {
  id: string
  name: string
  role: string
  avatar_url?: string
  email?: string
  status?: 'active' | 'busy' | 'offline'
}

export interface ActivityItem {
  id: string
  who: string
  action: string
  target: string
  time: string
  avatar?: string
}
