/**
 * Production OS V2 — SSE event stream + ingest.
 * Frontend publishes phase events; subscribers receive live updates (no progress polling).
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type StoredEvent = {
  id: string
  phase: string
  status: string
  message: string
  percentage: number
  at: number
  projectId?: string | null
}

const globalStore = globalThis as typeof globalThis & {
  __mugteePosEvents?: StoredEvent[]
  __mugteePosWaiters?: Set<(e: StoredEvent) => void>
}

function events(): StoredEvent[] {
  if (!globalStore.__mugteePosEvents) globalStore.__mugteePosEvents = []
  return globalStore.__mugteePosEvents
}

function waiters(): Set<(e: StoredEvent) => void> {
  if (!globalStore.__mugteePosWaiters) globalStore.__mugteePosWaiters = new Set()
  return globalStore.__mugteePosWaiters
}

function pushEvent(event: StoredEvent) {
  const list = events()
  list.push(event)
  if (list.length > 200) list.splice(0, list.length - 200)
  for (const w of waiters()) {
    try {
      w(event)
    } catch {
      /* ignore */
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { event?: StoredEvent; projectId?: string }
    const event = body.event
    if (!event?.id || !event.message) {
      return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 })
    }
    pushEvent({
      ...event,
      projectId: body.projectId ?? event.projectId ?? null,
      at: event.at || Date.now(),
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const projectId = url.searchParams.get('projectId')
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ type: 'hello', at: Date.now() })

      // Replay recent matching events
      for (const e of events().slice(-40)) {
        if (projectId && e.projectId && e.projectId !== projectId) continue
        send({ type: 'event', event: e })
      }

      const onEvent = (e: StoredEvent) => {
        if (projectId && e.projectId && e.projectId !== projectId) return
        send({ type: 'event', event: e })
      }
      waiters().add(onEvent)

      const heartbeat = setInterval(() => {
        try {
          send({ type: 'ping', at: Date.now() })
        } catch {
          clearInterval(heartbeat)
        }
      }, 15_000)

      const close = () => {
        clearInterval(heartbeat)
        waiters().delete(onEvent)
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }

      req.signal.addEventListener('abort', close)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
