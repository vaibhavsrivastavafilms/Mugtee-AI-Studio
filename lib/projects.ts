import { createSupabaseBrowserClient } from './supabase/client'

export async function createProject(project: {
  user_id: string
  title: string
  niche?: string
  platform?: string
  tone?: string
  goal?: string
}) {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) throw new Error('Authentication is not configured')
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
    .select()
    .single()

  if (error) throw error

  return data
}
