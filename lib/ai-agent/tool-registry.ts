/** Whitelisted agent tools — no arbitrary code execution. */

import { z } from 'zod'

export type MugteeToolCategory =
  | 'project'
  | 'generation'
  | 'search'
  | 'calendar'
  | 'publish'
  | 'business'
  | 'integration'
  | 'marketplace'

export type RegisteredTool = {
  name: string
  description: string
  category: MugteeToolCategory
  requiresProject?: boolean
  argsSchema: z.ZodType<Record<string, unknown>>
}

const looseArgs = z.object({}).passthrough()

export const REGISTERED_TOOLS = {
  createProject: {
    name: 'createProject',
    description: 'Create a new cinematic project from a goal/topic',
    category: 'project',
    argsSchema: z.object({ title: z.string().optional() }).passthrough(),
  },
  openProject: {
    name: 'openProject',
    description: 'Open an existing project by id (or latest when projectId is "latest")',
    category: 'project',
    requiresProject: true,
    argsSchema: z.object({ projectId: z.string().optional() }).passthrough(),
  },
  saveProject: {
    name: 'saveProject',
    description: 'Persist script, storyboard, and metadata to a cinematic project',
    category: 'project',
    requiresProject: true,
    argsSchema: z
      .object({
        projectId: z.string(),
        script: z.string().optional(),
        storyboard: z.unknown().optional(),
        title: z.string().optional(),
      })
      .passthrough(),
  },
  generateScript: {
    name: 'generateScript',
    description: 'Generate viral reel script from topic',
    category: 'generation',
    argsSchema: z.object({ topic: z.string().optional() }).passthrough(),
  },
  generateStoryboard: {
    name: 'generateStoryboard',
    description: 'Generate storyboard beats from script',
    category: 'generation',
    argsSchema: z.object({ script: z.string().optional() }).passthrough(),
  },
  generateVoiceover: {
    name: 'generateVoiceover',
    description: 'Synthesize voiceover from script',
    category: 'generation',
    argsSchema: z
      .object({ script: z.string().optional(), niche: z.string().optional(), tone: z.string().optional() })
      .passthrough(),
  },
  generateCaption: {
    name: 'generateCaption',
    description: 'Generate social captions',
    category: 'generation',
    argsSchema: z.object({ content: z.string().optional() }).passthrough(),
  },
  generateThumbnailIdeas: {
    name: 'generateThumbnailIdeas',
    description: 'Generate thumbnail title and visual concepts',
    category: 'generation',
    argsSchema: z.object({ topic: z.string().optional() }).passthrough(),
  },
  generateCarousel: {
    name: 'generateCarousel',
    description: 'Generate Instagram carousel slide copy',
    category: 'generation',
    argsSchema: z.object({ topic: z.string().optional() }).passthrough(),
  },
  generateCampaign: {
    name: 'generateCampaign',
    description: 'Generate multi-platform campaign outline',
    category: 'generation',
    argsSchema: z.object({ topic: z.string().optional() }).passthrough(),
  },
  generateCalendar: {
    name: 'generateCalendar',
    description: 'Suggest content calendar entries',
    category: 'calendar',
    argsSchema: z.object({ topic: z.string().optional() }).passthrough(),
  },
  generateHooks: {
    name: 'generateHooks',
    description: 'Generate hook variants',
    category: 'generation',
    argsSchema: z.object({ topic: z.string().optional(), count: z.number().optional() }).passthrough(),
  },
  generateShotlist: {
    name: 'generateShotlist',
    description: 'Generate shot list from script or topic',
    category: 'generation',
    argsSchema: z.object({ script: z.string().optional(), topic: z.string().optional() }).passthrough(),
  },
  generateYouTubeScript: {
    name: 'generateYouTubeScript',
    description: 'Generate YouTube short or long-form script outline',
    category: 'generation',
    argsSchema: z.object({ topic: z.string().optional() }).passthrough(),
  },
  generateInstagramReel: {
    name: 'generateInstagramReel',
    description: 'Generate Instagram reel script optimized for retention',
    category: 'generation',
    argsSchema: z.object({ topic: z.string().optional() }).passthrough(),
  },
  generatePodcastOutline: {
    name: 'generatePodcastOutline',
    description: 'Generate podcast episode outline and segments',
    category: 'generation',
    argsSchema: z.object({ topic: z.string().optional() }).passthrough(),
  },
  generateBrandStrategy: {
    name: 'generateBrandStrategy',
    description: 'Generate brand positioning and content pillars',
    category: 'generation',
    argsSchema: z.object({ topic: z.string().optional() }).passthrough(),
  },
  searchProjects: {
    name: 'searchProjects',
    description: 'Search recent cinematic projects',
    category: 'search',
    argsSchema: z.object({ query: z.string().optional() }).passthrough(),
  },
  searchMemory: {
    name: 'searchMemory',
    description: 'Retrieve creator memory profile hints',
    category: 'search',
    argsSchema: looseArgs,
  },
  publishProject: {
    name: 'publishProject',
    description: 'Queue project for publishing',
    category: 'publish',
    requiresProject: true,
    argsSchema: z
      .object({
        projectId: z.string(),
        platform: z.string().optional(),
        scheduledFor: z.string().optional(),
        caption: z.string().optional(),
      })
      .passthrough(),
  },
  searchAssets: {
    name: 'searchAssets',
    description: 'Search creative asset library',
    category: 'search',
    argsSchema: z.object({ query: z.string().optional(), natural: z.boolean().optional() }).passthrough(),
  },
  openAsset: {
    name: 'openAsset',
    description: 'Open a creative asset by id',
    category: 'search',
    argsSchema: z.object({ assetId: z.string() }).passthrough(),
  },
  findAsset: {
    name: 'findAsset',
    description: 'Find assets by natural language query',
    category: 'search',
    argsSchema: z.object({ query: z.string().optional() }).passthrough(),
  },
  createUpdatedVersion: {
    name: 'createUpdatedVersion',
    description: 'Create a regenerated version stub for an asset',
    category: 'generation',
    argsSchema: z.object({ assetId: z.string() }).passthrough(),
  },
  businessGrow: {
    name: 'businessGrow',
    description: 'Growth strategy — audience expansion and campaign suggestions',
    category: 'business',
    argsSchema: z.object({ goal: z.string().optional() }).passthrough(),
  },
  businessLeads: {
    name: 'businessLeads',
    description: 'Lead capture, scoring, nurturing, and opportunities',
    category: 'business',
    argsSchema: looseArgs,
  },
  businessRevenue: {
    name: 'businessRevenue',
    description: 'Offers, monetization analysis, and revenue tracking',
    category: 'business',
    argsSchema: looseArgs,
  },
  businessExecutiveReview: {
    name: 'businessExecutiveReview',
    description: 'COO executive review — priorities, risks, opportunities',
    category: 'business',
    argsSchema: z.object({ mode: z.enum(['coo', 'growth']).optional() }).passthrough(),
  },
  businessCampaignFromContent: {
    name: 'businessCampaignFromContent',
    description: 'Map content drop to lead + campaign recommendation',
    category: 'business',
    requiresProject: true,
    argsSchema: z
      .object({
        projectId: z.string().optional(),
        contentAssetId: z.string().optional(),
        engagementScore: z.number().optional(),
      })
      .passthrough(),
  },
  connectIntegration: {
    name: 'connectIntegration',
    description: 'Connect a third-party provider (Notion, Instagram, etc.)',
    category: 'integration',
    argsSchema: z.object({ provider: z.string().optional() }).passthrough(),
  },
  executeIntegration: {
    name: 'executeIntegration',
    description: 'Run an integration action on a connected provider',
    category: 'integration',
    argsSchema: z
      .object({
        provider: z.string().optional(),
        action: z.string().optional(),
        args: z.object({}).catchall(z.unknown()).optional(),
      })
      .passthrough(),
  },
  installMarketplaceAgent: {
    name: 'installMarketplaceAgent',
    description: 'Install a marketplace agent for the current user',
    category: 'marketplace',
    argsSchema: z.object({ agentSlug: z.string().optional() }).passthrough(),
  },
  runMarketplaceAgent: {
    name: 'runMarketplaceAgent',
    description: 'Execute an installed marketplace agent',
    category: 'marketplace',
    argsSchema: z.object({ agentSlug: z.string().optional() }).passthrough(),
  },
  schedulePublish: {
    name: 'schedulePublish',
    description: 'Schedule content publish to a social platform',
    category: 'publish',
    argsSchema: z
      .object({
        phrase: z.string().optional(),
        platform: z.string().optional(),
        caption: z.string().optional(),
        scheduledAt: z.string().optional(),
      })
      .passthrough(),
  },
} as const satisfies Record<string, RegisteredTool>

export type MugteeToolName = keyof typeof REGISTERED_TOOLS

export const TOOL_NAMES = Object.keys(REGISTERED_TOOLS) as MugteeToolName[]

export function isRegisteredTool(name: string): name is MugteeToolName {
  return name in REGISTERED_TOOLS
}

export function assertRegisteredTool(name: string): MugteeToolName {
  if (!isRegisteredTool(name)) {
    throw new Error(`Tool not registered: ${name}`)
  }
  return name
}

export function validateToolArgs(
  toolName: MugteeToolName,
  input: Record<string, unknown>
): Record<string, unknown> {
  const tool = REGISTERED_TOOLS[toolName]
  const parsed = tool.argsSchema.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ')
    throw new Error(`Invalid args for ${toolName}: ${msg}`)
  }
  return parsed.data as Record<string, unknown>
}
