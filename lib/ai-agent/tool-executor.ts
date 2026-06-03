import type { SupabaseClient } from '@supabase/supabase-js'
import {
  generateCaptions,
  generateHooks,
  generateViralScript,
} from '@/lib/ai/generation'
import {
  assertRegisteredTool,
  validateToolArgs,
  type MugteeToolName,
} from '@/lib/ai-agent/tool-registry'
import { loadCreatorMemoryForAgent } from '@/lib/ai-agent/memory-retrieval'
import { synthesizeQuickCutVoice } from '@/lib/cinematic/quick-cut/synthesize-voice'
import { callStructuredJson } from '@/lib/ai-agent/structured-llm'
import { createAssetEngine, formatAssetContextForPrompt } from '@/lib/assets/asset-engine'
import { createBusinessEngine } from '@/lib/business/business-engine'
import { connectProvider, runIntegrationAction } from '@/lib/integrations/integration-engine'
import {
  installMarketplaceAgent,
  loadInstallPermissions,
} from '@/lib/marketplace/agent-installer'
import { RestaurantAgent } from '@/lib/agent-sdk/restaurant-agent'
import { scheduleFromPhrase, schedulePublish } from '@/lib/publish/publish-engine'
import { defaultPermissionsForAgent } from '@/lib/marketplace/agent-permissions'

export type ToolContext = {
  supabase: SupabaseClient
  userId: string
  goal: string
  projectId?: string
  script?: string
  memoryContext?: string
}

async function runStructuredGeneration<T>(
  system: string,
  user: string,
  schemaHint: string
): Promise<T> {
  return callStructuredJson<T>({ system, user, schemaHint, max_tokens: 900 })
}

export async function executeRegisteredTool(
  toolName: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<Record<string, unknown>> {
  const tool = assertRegisteredTool(toolName)
  const args = validateToolArgs(tool, input)

  switch (tool) {
    case 'searchMemory': {
      const { profile, context } = await loadCreatorMemoryForAgent(
        ctx.supabase,
        ctx.userId,
        ctx.goal
      )
      return {
        niche: profile.preferences.niche,
        platform: profile.preferences.platform,
        relationshipLevel: profile.relationshipLevel,
        contextSnippet: context.slice(0, 2000),
      }
    }
    case 'searchAssets':
    case 'findAsset': {
      const engine = createAssetEngine(ctx.supabase, ctx.userId)
      await engine.ensureIndexed().catch(() => undefined)
      const query = String(args.query ?? ctx.goal)
      const natural = args.natural === true || tool === 'findAsset'
      const result = natural
        ? await engine.naturalLanguageSearch(query, {
            brand: args.brand ? String(args.brand) : undefined,
          })
        : await engine.search({ q: query, semantic: true, limit: 12 })
      return { assets: result.assets }
    }
    case 'openAsset': {
      const assetId = String(args.assetId ?? '')
      if (!assetId) throw new Error('assetId required')
      const engine = createAssetEngine(ctx.supabase, ctx.userId)
      const asset = await engine.getAsset(assetId)
      if (!asset) throw new Error('Asset not found')
      const [graph, versions, insights] = await Promise.all([
        engine.getGraph(assetId),
        engine.versions(assetId),
        engine.insights(assetId),
      ])
      return { asset, graph, versions, insights }
    }
    case 'createUpdatedVersion': {
      const assetId = String(args.assetId ?? '')
      if (!assetId) throw new Error('assetId required')
      const engine = createAssetEngine(ctx.supabase, ctx.userId)
      const asset = await engine.getAsset(assetId)
      const version = await engine.createUpdatedVersion(assetId)
      if (!version) throw new Error('Could not create version')
      return {
        version,
        regenHref: asset?.project
          ? `/studio/project/${asset.project}?regen=1`
          : null,
      }
    }
    case 'searchProjects': {
      const q = String(args.query ?? ctx.goal).slice(0, 200).replace(/[%_]/g, '')
      const { data } = await ctx.supabase
        .from('cinematic_projects')
        .select('id, title, prompt, niche, status, updated_at')
        .eq('user_id', ctx.userId)
        .or(`title.ilike.%${q}%,prompt.ilike.%${q}%`)
        .order('updated_at', { ascending: false })
        .limit(8)
      return { projects: data ?? [] }
    }
    case 'createProject': {
      const title = String(args.title ?? ctx.goal).slice(0, 120)
      const { data, error } = await ctx.supabase
        .from('cinematic_projects')
        .insert({
          user_id: ctx.userId,
          title,
          prompt: ctx.goal,
          style: 'cinematic',
          duration: 60,
          niche: 'storytelling',
          status: 'create',
          mode: 'quick',
        })
        .select('id, title')
        .single()
      if (error) throw new Error(error.message)
      return { projectId: data.id, title: data.title, href: `/create/${data.id}` }
    }
    case 'openProject': {
      let projectId = String(args.projectId ?? ctx.projectId ?? '')
      if (projectId === 'latest' || !projectId) {
        const { data: latest } = await ctx.supabase
          .from('cinematic_projects')
          .select('id')
          .eq('user_id', ctx.userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        projectId = latest?.id ?? ''
      }
      if (!projectId) throw new Error('projectId required')
      const { data, error } = await ctx.supabase
        .from('cinematic_projects')
        .select('id, title, script, hook, scenes, storyboard')
        .eq('id', projectId)
        .eq('user_id', ctx.userId)
        .single()
      if (error) throw new Error(error.message)
      return { project: data, href: `/create/${data.id}` }
    }
    case 'saveProject': {
      const projectId = String(args.projectId ?? ctx.projectId ?? '')
      if (!projectId) throw new Error('projectId required')
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (args.title) patch.title = String(args.title).slice(0, 120)
      if (args.script ?? ctx.script) patch.script = String(args.script ?? ctx.script)
      if (args.storyboard) patch.storyboard = args.storyboard
      const { data, error } = await ctx.supabase
        .from('cinematic_projects')
        .update(patch)
        .eq('id', projectId)
        .eq('user_id', ctx.userId)
        .select('id, title')
        .single()
      if (error) throw new Error(error.message)
      return { projectId: data.id, title: data.title, saved: true }
    }
    case 'publishProject': {
      const projectId = String(args.projectId ?? ctx.projectId ?? '')
      if (!projectId) throw new Error('projectId required')
      const platform = String(args.platform ?? 'instagram')
      const scheduledFor =
        typeof args.scheduledFor === 'string'
          ? args.scheduledFor
          : new Date(Date.now() + 3600_000).toISOString()
      const { data, error } = await ctx.supabase
        .from('publishing_queue')
        .insert({
          user_id: ctx.userId,
          content_id: null,
          platform,
          status: 'queued',
          scheduled_for: scheduledFor,
        })
        .select('id, status, scheduled_for, platform')
        .single()
      if (error) throw new Error(error.message)
      return {
        queueId: data.id,
        status: data.status,
        scheduledFor: data.scheduled_for,
        platform: data.platform,
        projectId,
        href: '/automations',
      }
    }
    case 'generateScript':
    case 'generateInstagramReel': {
      const topic = String(args.topic ?? ctx.goal)
      const assetCtx = await formatAssetContextForPrompt(ctx.supabase, ctx.userId, topic)
      const enrichedTopic = assetCtx ? `${topic}\n\n${assetCtx}` : topic
      const script =
        tool === 'generateInstagramReel'
          ? await generateViralScript(
              `Instagram Reel (vertical, hook-first, 45-60s):\n${enrichedTopic}`
            )
          : await generateViralScript(enrichedTopic)
      if (ctx.projectId) {
        await ctx.supabase
          .from('cinematic_projects')
          .update({ script })
          .eq('id', ctx.projectId)
          .eq('user_id', ctx.userId)
      }
      return { script }
    }
    case 'generateYouTubeScript': {
      const topic = String(args.topic ?? ctx.goal)
      const raw = await runStructuredGeneration<{ script: string; chapters: string[] }>(
        'You write YouTube scripts with chapters and retention hooks.',
        `Topic: ${topic}\nMemory: ${ctx.memoryContext?.slice(0, 1200) ?? ''}`,
        '{"script":"...","chapters":["..."]}'
      )
      return raw
    }
    case 'generatePodcastOutline': {
      const topic = String(args.topic ?? ctx.goal)
      return runStructuredGeneration<{ segments: Array<{ title: string; beats: string[] }> }>(
        'You outline podcast episodes with segment beats.',
        `Topic: ${topic}`,
        '{"segments":[{"title":"Intro","beats":["..."]}]}'
      )
    }
    case 'generateBrandStrategy': {
      const topic = String(args.topic ?? ctx.goal)
      return runStructuredGeneration<{
        positioning: string
        pillars: string[]
        voice: string
      }>(
        'You define creator brand strategy from memory and goals.',
        `Brand goal: ${topic}\nMemory:\n${ctx.memoryContext?.slice(0, 2000) ?? 'none'}`,
        '{"positioning":"...","pillars":["..."],"voice":"..."}'
      )
    }
    case 'generateCampaign': {
      const topic = String(args.topic ?? ctx.goal)
      return runStructuredGeneration<{
        campaignName: string
        platforms: string[]
        beats: string[]
      }>(
        'You design multi-platform creator campaigns.',
        `Campaign: ${topic}`,
        '{"campaignName":"...","platforms":["instagram"],"beats":["..."]}'
      )
    }
    case 'generateCarousel': {
      const topic = String(args.topic ?? ctx.goal)
      return runStructuredGeneration<{ slides: Array<{ headline: string; body: string }> }>(
        'You write Instagram carousel slides (hook slide first).',
        `Topic: ${topic}`,
        '{"slides":[{"headline":"...","body":"..."}]}'
      )
    }
    case 'generateThumbnailIdeas': {
      const topic = String(args.topic ?? ctx.goal)
      return runStructuredGeneration<{ ideas: Array<{ title: string; visual: string }> }>(
        'You generate click-worthy thumbnail concepts.',
        `Video topic: ${topic}`,
        '{"ideas":[{"title":"...","visual":"..."}]}'
      )
    }
    case 'generateShotlist': {
      const script = String(args.script ?? ctx.script ?? '')
      const topic = String(args.topic ?? ctx.goal)
      return runStructuredGeneration<{ shots: Array<{ shot: string; type: string; notes: string }> }>(
        'You create production shot lists for short-form video.',
        script ? `Script:\n${script.slice(0, 3500)}` : `Topic: ${topic}`,
        '{"shots":[{"shot":"1","type":"wide","notes":"..."}]}'
      )
    }
    case 'generateHooks': {
      const topic = String(args.topic ?? ctx.goal)
      const count = typeof args.count === 'number' ? args.count : 5
      const hooks = await generateHooks(topic, count)
      return { hooks }
    }
    case 'generateCaption': {
      const content = String(args.content ?? ctx.script ?? ctx.goal)
      const captions = await generateCaptions(content, 3)
      return { captions }
    }
    case 'generateStoryboard': {
      const script = String(args.script ?? ctx.script ?? '')
      if (!script.trim()) throw new Error('Script required for storyboard')
      const assetCtx = await formatAssetContextForPrompt(
        ctx.supabase,
        ctx.userId,
        ctx.goal || script.slice(0, 200)
      )
      const beats = await callStructuredJson<{ scenes: Array<{ beat: string; visual: string }> }>({
        system: 'You create cinematic storyboard beats for short-form reels.',
        user: `Script:\n${script.slice(0, 4000)}${assetCtx ? `\n\n${assetCtx}` : ''}`,
        schemaHint: '{"scenes":[{"beat":"string","visual":"string"}]}',
        max_tokens: 800,
      })
      if (ctx.projectId) {
        await ctx.supabase
          .from('cinematic_projects')
          .update({ storyboard: beats, script })
          .eq('id', ctx.projectId)
          .eq('user_id', ctx.userId)
      }
      return { storyboard: beats }
    }
    case 'generateVoiceover': {
      const script = String(args.script ?? ctx.script ?? '')
      if (!script.trim()) throw new Error('Script required for voiceover')
      const voice = await synthesizeQuickCutVoice(script, ctx.userId, {
        niche: String(args.niche ?? ''),
        tone: String(args.tone ?? 'cinematic'),
      })
      if (ctx.projectId && voice.audioUrl) {
        await ctx.supabase
          .from('cinematic_projects')
          .update({ voice: { audioUrl: voice.audioUrl, provider: voice.provider } })
          .eq('id', ctx.projectId)
          .eq('user_id', ctx.userId)
      }
      return { voiceover: voice }
    }
    case 'generateCalendar': {
      const raw = await callStructuredJson<{ entries: string[] }>({
        system: 'You suggest a 7-day short-form content calendar.',
        user: `Goal: ${ctx.goal}\nMemory: ${ctx.memoryContext?.slice(0, 1500) ?? 'none'}`,
        schemaHint: '{"entries":["Mon: ..."]}',
        max_tokens: 600,
      })
      return { calendar: raw.entries ?? [] }
    }
    case 'businessGrow': {
      const engine = createBusinessEngine(ctx.supabase, ctx.userId)
      const goal = String(args.goal ?? ctx.goal)
      const result = await engine.helpMeGrow(goal)
      return {
        agent: result.agent,
        strategy: result.strategy,
        decisions: result.decisions,
        href: '/studio/growth',
      }
    }
    case 'businessLeads': {
      const engine = createBusinessEngine(ctx.supabase, ctx.userId)
      await engine.bootstrap()
      const pipeline = await engine.runLeadPipeline()
      const nurture = await engine.nurture()
      return { pipeline, nurture, href: '/studio/growth' }
    }
    case 'businessRevenue': {
      const engine = createBusinessEngine(ctx.supabase, ctx.userId)
      const revenue = await engine.runRevenueAnalysis()
      return { revenue, href: '/studio/growth' }
    }
    case 'businessExecutiveReview': {
      const engine = createBusinessEngine(ctx.supabase, ctx.userId)
      const mode = args.mode === 'growth' ? 'growth' : 'coo'
      const review =
        mode === 'coo' ? await engine.actAsCoo() : { review: await engine.executiveReview('growth') }
      return { review, href: '/studio/growth' }
    }
    case 'businessCampaignFromContent': {
      const engine = createBusinessEngine(ctx.supabase, ctx.userId)
      const drop = await engine.onContentDrop({
        projectId: String(args.projectId ?? ctx.projectId ?? '') || undefined,
        contentAssetId: args.contentAssetId ? String(args.contentAssetId) : undefined,
        engagementScore:
          typeof args.engagementScore === 'number' ? args.engagementScore : undefined,
      })
      return { ...drop, href: '/studio/growth' }
    }
    case 'connectIntegration': {
      const provider = String(args.provider ?? 'notion')
      const result = await connectProvider(ctx.supabase, ctx.userId, provider)
      return { provider, status: result.row?.status ?? 'connected', stub: true }
    }
    case 'executeIntegration': {
      const provider = String(args.provider ?? 'notion')
      const action = String(args.action ?? 'list')
      const result = await runIntegrationAction(
        ctx.supabase,
        ctx.userId,
        provider,
        action,
        (args.args as Record<string, unknown>) ?? {}
      )
      return { result }
    }
    case 'installMarketplaceAgent': {
      const slug = String(args.agentSlug ?? 'restaurant-agent')
      const { install, grants } = await installMarketplaceAgent(ctx.supabase, ctx.userId, slug)
      return { install, grants }
    }
    case 'runMarketplaceAgent': {
      const slug = String(args.agentSlug ?? 'restaurant-agent')
      const grants =
        (await loadInstallPermissions(ctx.supabase, ctx.userId, slug)) ||
        defaultPermissionsForAgent(slug)
      if (slug === 'restaurant-agent') {
        const agent = new RestaurantAgent()
        agent.setPermissionGrants(grants)
        const result = await agent.run({
          userId: ctx.userId,
          goal: ctx.goal,
          permissions: grants.filter((g) => g.granted).map((g) => g.permission),
        })
        return { result }
      }
      return { summary: `Stub run for ${slug}`, outputs: { goal: ctx.goal } }
    }
    case 'schedulePublish': {
      const phrase = String(args.phrase ?? ctx.goal)
      if (/publish|schedule|tomorrow|pm|am/i.test(phrase)) {
        const row = await scheduleFromPhrase(ctx.supabase, ctx.userId, phrase, {
          platform: String(args.platform ?? 'instagram'),
          caption: String(args.caption ?? ''),
        })
        return { schedule: row }
      }
      const scheduledAt = args.scheduledAt
        ? new Date(String(args.scheduledAt))
        : new Date(Date.now() + 86400000)
      const row = await schedulePublish(ctx.supabase, ctx.userId, {
        platform: String(args.platform ?? 'instagram'),
        caption: String(args.caption ?? ''),
        scheduledAt,
        contentRef: {},
      })
      return { schedule: row }
    }
    default: {
      const _exhaustive: never = tool
      throw new Error(`Unhandled tool: ${_exhaustive}`)
    }
  }
}

/** Execute with retry-once for transient failures. */
export async function executeRegisteredToolWithRetry(
  toolName: MugteeToolName,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<Record<string, unknown>> {
  try {
    return await executeRegisteredTool(toolName, input, ctx)
  } catch (first) {
    try {
      return await executeRegisteredTool(toolName, input, ctx)
    } catch (second) {
      const msg = second instanceof Error ? second.message : 'Tool failed'
      const firstMsg = first instanceof Error ? first.message : ''
      throw new Error(firstMsg === msg ? msg : `${msg} (after retry)`)
    }
  }
}
