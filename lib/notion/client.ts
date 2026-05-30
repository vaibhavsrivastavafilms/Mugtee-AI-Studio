import type { ContentPiece } from '@/lib/types'
import { getNotionConfig, type NotionPropertyNames } from './env'

const NOTION_VERSION = '2022-06-28'
const BASE = 'https://api.notion.com/v1'

export class NotionApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'NotionApiError'
    this.status = status
    this.body = body
  }
}

function headers(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
}

async function notionFetch<T>(
  apiKey: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(apiKey), ...(init?.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      (body as { message?: string })?.message ||
      `Notion API error (${res.status})`
    throw new NotionApiError(msg, res.status, body)
  }
  return body as T
}

export async function validateNotionConnection(): Promise<{
  ok: boolean
  workspace?: string
  databaseTitle?: string
  error?: string
}> {
  const { apiKey, databaseId, configured } = getNotionConfig()
  if (!configured || !apiKey || !databaseId) {
    return { ok: false, error: 'not_configured' }
  }
  try {
    const me = await notionFetch<{ bot?: { owner?: { workspace?: { name?: string } } } }>(
      apiKey,
      '/users/me'
    )
    const db = await notionFetch<{ title?: { plain_text?: string }[] }>(
      apiKey,
      `/databases/${databaseId}`
    )
    const databaseTitle = db.title?.map((t) => t.plain_text).join('') || 'Calendar'
    const workspace = me.bot?.owner?.workspace?.name
    return { ok: true, workspace, databaseTitle }
  } catch (e: unknown) {
    const msg = e instanceof NotionApiError ? e.message : 'Connection failed'
    return { ok: false, error: msg }
  }
}

function richText(value: string) {
  return [{ type: 'text' as const, text: { content: value.slice(0, 2000) } }]
}

function buildPageProperties(
  item: ContentPiece,
  props: NotionPropertyNames
): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    [props.title]: {
      title: richText(item.title || 'Untitled'),
    },
    [props.mugteeId]: {
      rich_text: richText(String(item.id)),
    },
  }
  if (item.platform) {
    properties[props.platform] = { select: { name: item.platform } }
  }
  if (item.status) {
    properties[props.status] = { select: { name: item.status } }
  }
  if (item.scheduled_at) {
    properties[props.scheduled] = { date: { start: item.scheduled_at } }
  }
  if (item.description) {
    properties[props.description] = { rich_text: richText(item.description) }
  }
  return properties
}

async function findPageByMugteeId(
  apiKey: string,
  databaseId: string,
  mugteeIdProp: string,
  mugteeId: string
): Promise<string | null> {
  const result = await notionFetch<{ results: { id: string }[] }>(
    apiKey,
    `/databases/${databaseId}/query`,
    {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          property: mugteeIdProp,
          rich_text: { equals: mugteeId },
        },
        page_size: 1,
      }),
    }
  )
  return result.results?.[0]?.id || null
}

export async function upsertContentPieceInNotion(
  item: ContentPiece
): Promise<{ pageId: string; created: boolean }> {
  const { apiKey, databaseId, properties } = getNotionConfig()
  if (!apiKey || !databaseId) {
    throw new NotionApiError('Notion is not configured', 503, {})
  }

  const pageProperties = buildPageProperties(item, properties)
  const existingId = await findPageByMugteeId(
    apiKey,
    databaseId,
    properties.mugteeId,
    String(item.id)
  )

  if (existingId) {
    await notionFetch(apiKey, `/pages/${existingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties: pageProperties }),
    })
    return { pageId: existingId, created: false }
  }

  const created = await notionFetch<{ id: string }>(apiKey, '/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: pageProperties,
    }),
  })
  return { pageId: created.id, created: true }
}

export async function syncContentPiecesToNotion(
  items: ContentPiece[]
): Promise<{ synced: number; created: number; updated: number; errors: string[] }> {
  let synced = 0
  let created = 0
  let updated = 0
  const errors: string[] = []

  for (const item of items) {
    try {
      const result = await upsertContentPieceInNotion(item)
      synced += 1
      if (result.created) created += 1
      else updated += 1
    } catch (e: unknown) {
      const msg =
        e instanceof NotionApiError
          ? `${item.title}: ${e.message}`
          : `${item.title}: sync failed`
      errors.push(msg)
    }
  }

  return { synced, created, updated, errors }
}
