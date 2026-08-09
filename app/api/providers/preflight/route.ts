import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  runUnifiedProviderPreflight,
  runVideoProviderPreflight,
  toPublicProviderList,
} from '@/lib/v7/connections/provider-connection-manager.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [report, unified] = await Promise.all([
      runVideoProviderPreflight({
        userId: user.id,
        supabase,
      }),
      runUnifiedProviderPreflight({
        userId: user.id,
        supabase,
      }),
    ])

    return NextResponse.json({
      ok: unified.ready,
      ready: unified.ready,
      textProvider: unified.textProvider,
      imageProvider: unified.imageProvider,
      videoProvider: unified.videoProvider,
      selectedProvider: report.selectedProvider,
      error: report.error,
      text: unified.text,
      image: unified.image,
      video: unified.video,
      providers: unified.providers,
      providerReport: toPublicProviderList(report.providers),
    })
  } catch (error) {
    console.error('[providers/preflight] failed', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'PROVIDER_MANAGER_ERROR',
        message: error instanceof Error ? error.message : 'Preflight failed',
      },
      { status: 500 }
    )
  }
}
