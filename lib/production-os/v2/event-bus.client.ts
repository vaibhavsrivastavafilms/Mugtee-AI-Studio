'use client'

/**
 * In-session Production OS V2 event bus.
 * Feeds Live Activity + optional SSE bridge without fake polling timers.
 */

import type { ProductionOsV2PhaseEvent } from '@/lib/production-os/v2/events'
import { appendGenerationActivity } from '@/lib/quick-cut/generation-activity.client'

type Listener = (event: ProductionOsV2PhaseEvent) => void

const KEY = 'mugtee:production-os-v2-events'
const listeners = new Set<Listener>()

function readEvents(): ProductionOsV2PhaseEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ProductionOsV2PhaseEvent[]) : []
  } catch {
    return []
  }
}

function writeEvents(events: ProductionOsV2PhaseEvent[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(KEY, JSON.stringify(events.slice(-80)))
  } catch {
    /* quota */
  }
}

export function clearProductionOsV2Events(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function getProductionOsV2Events(): ProductionOsV2PhaseEvent[] {
  return readEvents()
}

export function publishProductionOsV2Event(event: ProductionOsV2PhaseEvent): void {
  const next = [...readEvents().filter((e) => e.id !== event.id), event]
  writeEvents(next)

  const activityStatus =
    event.status === 'completed' || event.status === 'skipped'
      ? 'completed'
      : event.status === 'failed'
        ? 'completed'
        : 'current'

  appendGenerationActivity({
    id: `pos-${event.phase}-${event.status}`,
    label: event.message,
    status: activityStatus,
    at: event.at,
  })

  for (const listener of listeners) {
    try {
      listener(event)
    } catch {
      /* ignore listener errors */
    }
  }

  // Best-effort push to server event log for SSE subscribers
  if (typeof window !== 'undefined' && event.meta?.file !== 'local-only') {
    void fetch('/api/production-os/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
      keepalive: true,
    }).catch(() => {})
  }
}

export function subscribeProductionOsV2Events(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
