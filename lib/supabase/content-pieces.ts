// Phase 7B — Content Pieces Save Logic
// Minimal Supabase integration for script/hooks/captions storage.
// Reuses existing browser client. No new abstractions.

import { createSupabaseBrowserClient } from './client'

export type ContentPieceInput = {
  script?: string
  description?: string
  notes?: string
  title?: string
  platform?: string
}

export async function saveContentPiece(data: ContentPieceInput): Promise<{ id: string }> {
  const supabase = createSupabaseBrowserClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) throw new Error('User not authenticated')

  const payload = {
    user_id: user.id,
    title: data.title || 'Generated Content',
    platform: data.platform || 'instagram_reel',
    script: data.script || null,
    description: data.description || null,
    notes: data.notes || null,
    created_at: new Date().toISOString(),
  }

  const { data: saved, error } = await supabase
    .from('content_pieces')
    .insert([payload])
    .select('id')
    .single()

  if (error) throw new Error(`Save failed: ${error.message}`)
  if (!saved?.id) throw new Error('No ID returned from save')

  return { id: saved.id }
}
