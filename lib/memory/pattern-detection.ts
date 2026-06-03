import type { SupabaseClient } from '@supabase/supabase-js'

export type WorkflowSignals = {
  hookRegens?: number
  scriptRegens?: number
  hook?: string
  theme?: string
  format?: string
  platform?: string
  contentType?: string
  campaign?: string
  brandSlug?: string
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').slice(0, 64)
}

/** Detect formats, campaigns, and content types from workflow completion */
export async function detectAndPersistPatterns(
  supabase: SupabaseClient,
  userId: string,
  signals: WorkflowSignals,
  brandId?: string | null
): Promise<void> {
  const upserts: Array<{ pattern_type: string; label: string; payload: Record<string, unknown> }> = []

  if (signals.format?.trim()) {
    upserts.push({
      pattern_type: 'format',
      label: signals.format.trim().slice(0, 80),
      payload: { source: 'workflow' },
    })
  }
  if (signals.platform?.trim()) {
    upserts.push({
      pattern_type: 'platform',
      label: signals.platform.trim().slice(0, 40),
      payload: {},
    })
  }
  if (signals.contentType?.trim()) {
    upserts.push({
      pattern_type: 'content_type',
      label: signals.contentType.trim().slice(0, 80),
      payload: {},
    })
  }
  if (signals.campaign?.trim()) {
    upserts.push({
      pattern_type: 'campaign',
      label: signals.campaign.trim().slice(0, 120),
      payload: {},
    })
  }
  if (signals.theme?.trim()) {
    upserts.push({
      pattern_type: 'theme',
      label: signals.theme.trim().slice(0, 80),
      payload: {},
    })
  }
  if (signals.hook?.trim() && (signals.hookRegens ?? 0) === 0) {
    upserts.push({
      pattern_type: 'hook_style',
      label: signals.hook.trim().slice(0, 60),
      payload: { accepted: true },
    })
  }

  for (const row of upserts) {
    const { data: existing } = await supabase
      .from('creator_patterns')
      .select('id, strength')
      .eq('user_id', userId)
      .eq('pattern_type', row.pattern_type)
      .eq('label', row.label)
      .is('brand_id', brandId ?? null)
      .maybeSingle()

    if (existing?.id) {
      await supabase
        .from('creator_patterns')
        .update({
          strength: Math.min(10, Number(existing.strength ?? 1) + 0.5),
          last_seen_at: new Date().toISOString(),
          payload: row.payload,
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('creator_patterns').insert({
        user_id: userId,
        brand_id: brandId ?? null,
        pattern_type: row.pattern_type,
        label: row.label,
        strength: 1,
        payload: row.payload,
      })
    }
  }

  const regens = (signals.hookRegens ?? 0) + (signals.scriptRegens ?? 0)
  if (regens >= 2) {
    await supabase.from('creator_feedback').insert({
      user_id: userId,
      brand_id: brandId ?? null,
      feedback_type: 'iteration_heavy',
      aspect: signals.scriptRegens ? 'script' : 'hook',
      rating: -1,
      payload: { hookRegens: signals.hookRegens, scriptRegens: signals.scriptRegens },
    })
  }
}

export async function ensureDefaultBrand(
  supabase: SupabaseClient,
  userId: string,
  slug: string,
  displayName: string
): Promise<string | null> {
  const normalized = slugify(slug)
  const { data } = await supabase
    .from('brand_profiles')
    .upsert(
      {
        user_id: userId,
        slug: normalized,
        display_name: displayName,
        is_default: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,slug' }
    )
    .select('id')
    .maybeSingle()
  return data?.id ? String(data.id) : null
}
