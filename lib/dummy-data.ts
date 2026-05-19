import type { ContentPiece, CrewMember, ActivityItem } from './types'

export const CREW: CrewMember[] = [
  { id: 'c1', name: 'Aria Knox', role: 'Showrunner', status: 'active', avatar_url: 'https://i.pravatar.cc/120?img=47' },
  { id: 'c2', name: 'Leo Marchetti', role: 'Director of Photography', status: 'busy', avatar_url: 'https://i.pravatar.cc/120?img=12' },
  { id: 'c3', name: 'Saanvi Rao', role: 'Editor', status: 'active', avatar_url: 'https://i.pravatar.cc/120?img=32' },
  { id: 'c4', name: 'Theo Bennett', role: 'Sound Engineer', status: 'offline', avatar_url: 'https://i.pravatar.cc/120?img=15' },
  { id: 'c5', name: 'Nadia Chen', role: 'Social Producer', status: 'active', avatar_url: 'https://i.pravatar.cc/120?img=49' },
]

export const CONTENT: ContentPiece[] = [
  { id: 'p1', title: 'Midnight Pasta · Rome', status: 'shooting', platform: 'youtube', due_date: '2025-06-22', assignee: 'Aria Knox', tags: ['series', 'travel'], description: '12-min episode exploring late-night carbonara haunts.' },
  { id: 'p2', title: 'Knife Skills Masterclass', status: 'editing', platform: 'youtube', due_date: '2025-06-18', assignee: 'Saanvi Rao', tags: ['tutorial'], description: 'Long-form premium tutorial.' },
  { id: 'p3', title: 'Sourdough Reel · Day 3', status: 'scheduled', platform: 'instagram', scheduled_at: '2025-06-16T18:00:00Z', assignee: 'Nadia Chen', tags: ['reel', 'baking'] },
  { id: 'p4', title: 'Tokyo Ramen Tour Teaser', status: 'idea', platform: 'tiktok', assignee: 'Aria Knox', tags: ['teaser', 'travel'] },
  { id: 'p5', title: 'Chef Q&A · Massimo', status: 'scripting', platform: 'youtube', due_date: '2025-06-30', assignee: 'Aria Knox', tags: ['interview'] },
  { id: 'p6', title: 'Plating Aesthetic Reel', status: 'scheduled', platform: 'instagram', scheduled_at: '2025-06-17T15:00:00Z', assignee: 'Nadia Chen', tags: ['reel'] },
  { id: 'p7', title: 'Dry-Aged Steak Short', status: 'editing', platform: 'tiktok', due_date: '2025-06-15', assignee: 'Saanvi Rao', tags: ['short'] },
  { id: 'p8', title: 'BTS · Paris Bistro Series', status: 'published', platform: 'youtube', assignee: 'Leo Marchetti', tags: ['bts'] },
  { id: 'p9', title: 'Wine Pairing 101 · Carousel', status: 'scripting', platform: 'instagram', due_date: '2025-06-24', assignee: 'Nadia Chen', tags: ['carousel', 'education'] },
  { id: 'p10', title: 'Espresso Bar Vlog', status: 'shooting', platform: 'youtube', due_date: '2025-06-20', assignee: 'Leo Marchetti', tags: ['vlog'] },
  { id: 'p11', title: 'Behind The Plate · Twitter Thread', status: 'idea', platform: 'twitter', assignee: 'Aria Knox', tags: ['thread'] },
  { id: 'p12', title: 'Studio Tour LinkedIn Post', status: 'published', platform: 'linkedin', assignee: 'Theo Bennett', tags: ['brand'] },
]

export const ACTIVITY: ActivityItem[] = [
  { id: 'a1', who: 'Aria Knox', action: 'moved', target: 'Midnight Pasta · Rome to Shooting', time: '2m ago', avatar: 'https://i.pravatar.cc/80?img=47' },
  { id: 'a2', who: 'Saanvi Rao', action: 'uploaded', target: 'rough_cut_v3.mp4', time: '18m ago', avatar: 'https://i.pravatar.cc/80?img=32' },
  { id: 'a3', who: 'Nadia Chen', action: 'scheduled', target: 'Sourdough Reel · Day 3', time: '1h ago', avatar: 'https://i.pravatar.cc/80?img=49' },
  { id: 'a4', who: 'Leo Marchetti', action: 'commented on', target: 'Tokyo Ramen Tour Teaser', time: '3h ago', avatar: 'https://i.pravatar.cc/80?img=12' },
  { id: 'a5', who: 'Theo Bennett', action: 'completed', target: 'Audio pass on Knife Skills', time: '6h ago', avatar: 'https://i.pravatar.cc/80?img=15' },
  { id: 'a6', who: 'Aria Knox', action: 'created', target: 'Chef Q&A · Massimo', time: '1d ago', avatar: 'https://i.pravatar.cc/80?img=47' },
]

export const STATUS_META: Record<string, { label: string; color: string; ring: string }> = {
  idea:       { label: 'Idea',       color: 'bg-zinc-500/15 text-zinc-300',     ring: 'ring-zinc-500/30' },
  scripting:  { label: 'Scripting',  color: 'bg-blue-500/15 text-blue-300',     ring: 'ring-blue-500/30' },
  shooting:   { label: 'Shooting',   color: 'bg-orange-500/15 text-orange-300', ring: 'ring-orange-500/30' },
  editing:    { label: 'Editing',    color: 'bg-purple-500/15 text-purple-300', ring: 'ring-purple-500/30' },
  scheduled:  { label: 'Scheduled',  color: 'bg-gold-500/15 text-gold-300',     ring: 'ring-gold-500/30' },
  published:  { label: 'Published',  color: 'bg-emerald-500/15 text-emerald-300', ring: 'ring-emerald-500/30' },
}

export const PLATFORM_META: Record<string, { label: string; color: string }> = {
  youtube:   { label: 'YouTube',   color: 'text-red-400' },
  instagram: { label: 'Instagram', color: 'text-pink-400' },
  tiktok:    { label: 'TikTok',    color: 'text-cyan-300' },
  twitter:   { label: 'Twitter',   color: 'text-sky-400' },
  linkedin:  { label: 'LinkedIn',  color: 'text-blue-400' },
}
