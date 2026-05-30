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
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
    .select()
    .single()

  if (error) throw error

  return data
}
