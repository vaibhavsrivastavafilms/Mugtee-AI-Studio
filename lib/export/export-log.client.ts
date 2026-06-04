'use client'

type ExportLogPayload = Record<string, unknown>

let activeGroup: string | null = null

function safePayload(payload: ExportLogPayload): ExportLogPayload {
  const out: ExportLogPayload = {}
  for (const [key, value] of Object.entries(payload)) {
    if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('token')) continue
    if (typeof value === 'string' && value.startsWith('eyJ')) continue
    out[key] = value
  }
  return out
}

export function mugteeExportGroup(stage: string, payload?: ExportLogPayload): void {
  if (typeof console === 'undefined' || typeof console.group !== 'function') return
  if (activeGroup) {
    console.groupEnd()
  }
  activeGroup = stage
  console.group(`[MUGTEE EXPORT] ${stage}`)
  if (payload) {
    console.log(safePayload(payload))
  }
}

export function mugteeExportLog(stage: string, payload?: ExportLogPayload): void {
  if (typeof console === 'undefined') return
  if (payload) {
    console.log(`[MUGTEE EXPORT] ${stage}`, safePayload(payload))
  } else {
    console.log(`[MUGTEE EXPORT] ${stage}`)
  }
}

export function mugteeExportEnd(): void {
  if (typeof console === 'undefined' || typeof console.groupEnd !== 'function') return
  if (activeGroup) {
    console.groupEnd()
    activeGroup = null
  }
}

export function mugteeExportSnapshot(input: {
  projectId?: string | null
  scenes?: unknown[] | null
  storyboards?: unknown[] | null
  payload?: unknown
  stage: string
}): void {
  mugteeExportLog(input.stage, {
    Project: input.projectId ?? null,
    'Scenes count': input.scenes?.length ?? 0,
    'Storyboards count': input.storyboards?.length ?? input.scenes?.length ?? 0,
    Payload: input.payload ?? null,
  })
}
