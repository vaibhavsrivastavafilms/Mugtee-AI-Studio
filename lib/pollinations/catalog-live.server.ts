import 'server-only'

import {
  parsePollinationsImageCatalogModel,
  parsePollinationsVideoCatalogModel,
  type PollinationsImageCatalogModel,
  type PollinationsVideoCatalogModel,
} from '@/lib/pollinations/video-estimate-core'
import { GEN_POLLINATIONS_BASE } from '@/lib/pollinations/models.server'

export type PollinationsLiveCatalogEntry = {
  raw: Record<string, unknown>
  model: PollinationsVideoCatalogModel
}

export type PollinationsLiveImageCatalogEntry = {
  raw: Record<string, unknown>
  model: PollinationsImageCatalogModel
}

export type PollinationsLiveFullCatalog = {
  source: string
  fetchedAt: string
  videoEntries: PollinationsLiveCatalogEntry[]
  imageEntries: PollinationsLiveImageCatalogEntry[]
}

async function fetchPollinationsCatalogPayload(): Promise<{
  source: string
  fetchedAt: string
  list: Record<string, unknown>[]
}> {
  const res = await fetch(`${GEN_POLLINATIONS_BASE}/image/models`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Pollinations model catalog unavailable (HTTP ${res.status})`)
  }

  const data = (await res.json()) as unknown
  const list = (
    Array.isArray(data)
      ? data
      : Array.isArray((data as { data?: unknown[] })?.data)
        ? (data as { data: unknown[] }).data
        : []
  ).filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')

  return {
    source: `${GEN_POLLINATIONS_BASE}/image/models`,
    fetchedAt: new Date().toISOString(),
    list,
  }
}

export async function fetchLivePollinationsFullCatalog(): Promise<PollinationsLiveFullCatalog> {
  const payload = await fetchPollinationsCatalogPayload()
  const videoEntries: PollinationsLiveCatalogEntry[] = []
  const imageEntries: PollinationsLiveImageCatalogEntry[] = []

  for (const raw of payload.list) {
    const videoModel = parsePollinationsVideoCatalogModel(raw)
    if (videoModel) videoEntries.push({ raw, model: videoModel })

    const imageModel = parsePollinationsImageCatalogModel(raw)
    if (imageModel) imageEntries.push({ raw, model: imageModel })
  }

  return {
    source: payload.source,
    fetchedAt: payload.fetchedAt,
    videoEntries,
    imageEntries,
  }
}

export async function fetchLivePollinationsVideoCatalog(): Promise<{
  source: string
  fetchedAt: string
  entries: PollinationsLiveCatalogEntry[]
}> {
  const catalog = await fetchLivePollinationsFullCatalog()
  return {
    source: catalog.source,
    fetchedAt: catalog.fetchedAt,
    entries: catalog.videoEntries,
  }
}
