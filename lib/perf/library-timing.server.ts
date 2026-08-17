import 'server-only'

type LibraryTimingMarks = {
  auth?: number
  v7Query?: number
  cinematicQuery?: number
  v3Query?: number
  assets?: number
  stages?: number
  scenes?: number
  mapping?: number
  total?: number
}

export type LibraryTimingRecorder = {
  mark: (name: keyof Omit<LibraryTimingMarks, 'total'>) => void
  finish: () => void
}

export function createLibraryTimingRecorder(): LibraryTimingRecorder {
  const started = performance.now()
  const marks: LibraryTimingMarks = {}

  return {
    mark(name) {
      marks[name] = Math.round(performance.now() - started)
    },
    finish() {
      marks.total = Math.round(performance.now() - started)
      console.info(
        `[library-timing] auth: ${marks.auth ?? '-'}ms v7-query: ${marks.v7Query ?? '-'}ms cinematic-query: ${marks.cinematicQuery ?? '-'}ms v3-query: ${marks.v3Query ?? '-'}ms assets: ${marks.assets ?? '-'}ms stages: ${marks.stages ?? '-'}ms scenes: ${marks.scenes ?? '-'}ms mapping: ${marks.mapping ?? '-'}ms total: ${marks.total}ms`
      )
    },
  }
}

export function logProductionTiming(params: {
  authMs: number
  queryMs: number
  relationsMs?: number
  reconcileMs: number
  totalMs: number
  productionId: string
}) {
  const relations =
    typeof params.relationsMs === 'number' ? ` relations: ${params.relationsMs}ms` : ''
  console.info(
    `[production-timing] id=${params.productionId} auth: ${params.authMs}ms query: ${params.queryMs}ms${relations} reconcile: ${params.reconcileMs}ms total: ${params.totalMs}ms`
  )
}
