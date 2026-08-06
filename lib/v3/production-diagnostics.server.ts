import 'server-only'

import { randomUUID } from 'node:crypto'

import { geminiPlannerProvider } from '@/agents/planner/providers/gemini.server'
import { openaiPlannerProvider } from '@/agents/planner/providers/openai.server'
import { resolveTextProviderOrder } from '@/agents/shared/provider-order'
import { describeGeminiKeyFormat } from '@/lib/ai/free-tier'

export type V3ProductionRequestContext = {
  requestId: string
  userId?: string
  projectId?: string
  stage?: string
  provider?: string
  latencyMs?: number
}

export function createV3RequestContext(params?: {
  userId?: string
  projectId?: string
  stage?: string
}): V3ProductionRequestContext {
  return {
    requestId: randomUUID(),
    userId: params?.userId,
    projectId: params?.projectId,
    stage: params?.stage,
  }
}

export function logV3ProductionEvent(
  level: 'info' | 'warn' | 'error',
  message: string,
  ctx: V3ProductionRequestContext,
  extra?: Record<string, unknown>
) {
  const payload = {
    requestId: ctx.requestId,
    userId: ctx.userId ?? null,
    projectId: ctx.projectId ?? null,
    stage: ctx.stage ?? null,
    provider: ctx.provider ?? null,
    latencyMs: ctx.latencyMs ?? null,
    ...extra,
  }

  const line = `[v3] ${message} ${JSON.stringify(payload)}`
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}

export function getV3TextProviderDiagnostics() {
  const providers = [openaiPlannerProvider, geminiPlannerProvider]
  const order = resolveTextProviderOrder('PLANNER_PROVIDER', providers)
  const openaiKey = process.env.OPENAI_API_KEY?.trim()
  const geminiKeyFormat = describeGeminiKeyFormat()

  return {
    plannerProvider: process.env.PLANNER_PROVIDER?.trim() || 'auto',
    scriptProvider: process.env.SCRIPT_PROVIDER?.trim() || 'auto',
    v3TextProvider: process.env.V3_TEXT_PROVIDER?.trim() || 'auto',
    freeTierOnly: process.env.FREE_TIER_ONLY?.trim() || null,
    providers: {
      openai: {
        configured: openaiPlannerProvider.isConfigured(),
        keyFormat: !openaiKey ? 'missing' : openaiKey.startsWith('sk-') ? 'openai' : 'unknown',
      },
      gemini: {
        configured: geminiPlannerProvider.isConfigured(),
        keyFormat: geminiKeyFormat,
      },
    },
    plannerOrder: order.map((p) => p.id),
  }
}
