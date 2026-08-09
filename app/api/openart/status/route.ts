import { NextResponse } from 'next/server'
import { tryCreateSupabaseServerClient } from '@/lib/supabase/server'
import { loadOpenArtMcpCatalog } from '@/lib/openart/mcp-catalog.server'
import { probeOpenArtMcpHealth } from '@/lib/openart/mcp-generate.server'
import { isOpenArtMcpError } from '@/lib/openart/openart-errors.server'
import { diagnoseOpenArtConnection } from '@/lib/openart/oauth.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await tryCreateSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        {
          connected: false,
          authenticated: false,
          ready: false,
          provider: 'openart',
          error: 'OPENART_STATUS_READ_FAILED',
          message: 'Supabase not configured',
          reason: 'Supabase server client unavailable',
          action: 'Configure Supabase environment variables',
        },
        { status: 503 }
      )
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        {
          connected: false,
          authenticated: false,
          ready: false,
          provider: 'openart',
          error: 'OPENART_NOT_AUTHENTICATED',
          message: 'Sign in to connect OpenArt MCP',
          reason: 'No authenticated Supabase user',
          action: 'Complete OAuth connection at /api/openart/auth',
          connectUrl: '/api/openart/auth',
        },
        { status: 401 }
      )
    }

    const diagnosis = await diagnoseOpenArtConnection(user.id)

    if (!diagnosis.connected) {
      return NextResponse.json({
        connected: false,
        authenticated: false,
        ready: false,
        provider: 'openart',
        error: diagnosis.error ?? 'OPENART_NOT_AUTHENTICATED',
        reason: diagnosis.reason ?? 'TOKEN_NOT_FOUND',
        message: diagnosis.reason ?? 'Complete OAuth at /api/openart/auth',
        diagnosis: {
          hasRow: diagnosis.hasRow,
          status: diagnosis.status,
          hasAccessToken: diagnosis.hasAccessToken,
          hasRefreshToken: diagnosis.hasRefreshToken,
          expiresAt: diagnosis.expiresAt,
        },
        connectUrl: '/api/openart/auth',
        action: 'Complete OAuth connection at /api/openart/auth',
      })
    }

    let workspace: unknown = null
    let credits: unknown = null
    let mcpReady = true
    let mcpMessage: string | null = null
    let catalogExtras: Record<string, unknown> = {}

    try {
      const [catalog, health] = await Promise.all([
        loadOpenArtMcpCatalog(user.id),
        probeOpenArtMcpHealth(user.id),
      ])
      workspace = catalog.workspace
      credits = catalog.credits
      mcpReady = catalog.ready && health.healthy
      mcpMessage = health.message ?? null
      catalogExtras = {
        models: catalog.models,
        videoModels: catalog.videoModels,
        imageModels: catalog.imageModels,
        selectedVideoModel: catalog.selectedVideoModel,
        selectedImageModel: catalog.selectedImageModel,
        healthy: health.healthy,
        catalogFetchedAt: new Date(catalog.fetchedAt).toISOString(),
        tools: {
          imageGeneration: catalog.tools.imageTool?.name ?? null,
          imageEditing: catalog.tools.imageEditTool?.name ?? null,
          imageToVideo: catalog.tools.imageToVideoTool?.name ?? null,
          videoGeneration: catalog.tools.videoTool?.name ?? null,
          modelList: catalog.tools.modelListTool?.name ?? null,
          workspace: catalog.tools.workspaceTool?.name ?? null,
          credits: catalog.tools.creditsTool?.name ?? null,
        },
      }
    } catch (err) {
      mcpReady = false
      mcpMessage = err instanceof Error ? err.message : 'OpenArt MCP probe failed'
      if (isOpenArtMcpError(err)) {
        catalogExtras = { mcpError: err.code, mcpErrorMessage: err.message }
      }
    }

    return NextResponse.json({
      connected: true,
      authenticated: true,
      ready: mcpReady,
      provider: 'openart',
      workspace,
      credits,
      mcpReady,
      mcpMessage,
      diagnosis: {
        hasRow: diagnosis.hasRow,
        status: diagnosis.status,
        hasAccessToken: diagnosis.hasAccessToken,
        hasRefreshToken: diagnosis.hasRefreshToken,
        expiresAt: diagnosis.expiresAt,
      },
      connectUrl: '/api/openart/auth',
      ...catalogExtras,
    })
  } catch (err) {
    console.error('[openart/status] unexpected failure', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      provider: 'openart',
    })
    return NextResponse.json(
      {
        connected: false,
        authenticated: false,
        ready: false,
        provider: 'openart',
        error: 'OPENART_STATUS_READ_FAILED',
        message: err instanceof Error ? err.message : 'OpenArt status unavailable',
        reason: err instanceof Error ? err.message : 'Unexpected status failure',
      },
      { status: 422 }
    )
  }
}
