import { CONTENT, CREW } from './dummy-data'

export async function seedDemoData(supabase: any, userId: string) {
  // Crew (insert first so we have IDs if needed later)
  await supabase.from('crew').insert(
    CREW.map(c => ({
      user_id: userId,
      name: c.name,
      role: c.role,
      avatar_url: c.avatar_url,
      status: c.status,
    }))
  )

  // Content pieces
  await supabase.from('content_pieces').insert(
    CONTENT.map(c => ({
      user_id: userId,
      title: c.title,
      description: c.description ?? null,
      status: c.status,
      platform: c.platform,
      scheduled_at: c.scheduled_at ?? null,
      due_date: c.due_date ?? null,
      assignee: c.assignee ?? null,
      tags: c.tags ?? [],
    }))
  )

  // Shoots
  await supabase.from('shoots').insert([
    { user_id: userId, title: 'Midnight Pasta · Rome',     date: '2025-06-22', start_time: '21:00', end_time: '02:00', location: 'Trastevere, Rome',  status: 'planned' },
    { user_id: userId, title: 'Espresso Bar Vlog',           date: '2025-06-20', start_time: '08:30', end_time: '12:30', location: 'Brera, Milan',      status: 'today' },
    { user_id: userId, title: 'Knife Skills Reshoot',        date: '2025-06-25', start_time: '14:00', end_time: '18:00', location: 'Studio A, Soho',    status: 'planned' },
    { user_id: userId, title: 'Tokyo Ramen Tour B-Roll',     date: '2025-06-12', location: 'Shibuya, Tokyo', status: 'wrapped' },
  ])

  // Media
  await supabase.from('media').insert([
    { user_id: userId, title: 'Pasta_carbonara_master_v4.mp4',  type: 'video', size_bytes: 2300000000, thumbnail: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600' },
    { user_id: userId, title: 'Plating_aesthetic_07.png',        type: 'image', size_bytes: 8400000,    thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600' },
    { user_id: userId, title: 'Espresso_pull_bts.mov',           type: 'video', size_bytes: 1100000000, thumbnail: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600' },
    { user_id: userId, title: 'Knife_skills_thumb.jpg',          type: 'image', size_bytes: 3200000,    thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600' },
    { user_id: userId, title: 'Ambient_score_loop.wav',          type: 'audio', size_bytes: 46000000 },
    { user_id: userId, title: 'Sourdough_macro_02.jpg',          type: 'image', size_bytes: 5700000,    thumbnail: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600' },
    { user_id: userId, title: 'Tokyo_ramen_broll.mp4',           type: 'video', size_bytes: 4800000000, thumbnail: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=600' },
    { user_id: userId, title: 'Wine_pairing_carousel.png',       type: 'image', size_bytes: 12000000,   thumbnail: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600' },
  ])

  // Welcome activity entry
  await supabase.from('team_activity').insert({
    user_id: userId,
    actor: 'Mugtee',
    action: 'initialised',
    target: 'your studio with cinematic demo data',
  })
}
