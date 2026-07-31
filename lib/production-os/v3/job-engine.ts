/**
 * Production OS V3 job engine — phase workers emit real reports.
 * In-memory for the request lifecycle; mirrored into generation_jobs metadata.
 */

import {
  PRODUCTION_OS_V3_PHASE_ORDER,
  type ProductionJobStatus,
  type ProductionOsV3Checkpoint,
  type ProductionOsV3PhaseId,
  type ProductionWorkerReport,
  type SceneProductionUnit,
  PRODUCTION_OS_V3,
} from '@/lib/production-os/v3/types'
import { computeV3Progress } from '@/lib/production-os/v3/progress'

type Listener = (report: ProductionWorkerReport) => void

const globalStore = globalThis as typeof globalThis & {
  __mugteePosV3Jobs?: Map<string, ProductionOsV3Runtime>
}

export type ProductionOsV3Runtime = {
  projectId: string
  jobId: string
  phase: ProductionOsV3PhaseId
  completedPhases: ProductionOsV3PhaseId[]
  scenes: SceneProductionUnit[]
  reports: ProductionWorkerReport[]
  framesRendered: number
  framesTotal: number
  renderSpeedFps: number
  startedAt: number
  listeners: Set<Listener>
}

function registry(): Map<string, ProductionOsV3Runtime> {
  if (!globalStore.__mugteePosV3Jobs) globalStore.__mugteePosV3Jobs = new Map()
  return globalStore.__mugteePosV3Jobs
}

export function createProductionJob(input: {
  projectId: string
  jobId: string
  scenes: SceneProductionUnit[]
  resumeFrom?: ProductionOsV3Checkpoint | null
}): ProductionOsV3Runtime {
  const completedPhases = input.resumeFrom?.completedPhases ?? []
  const phase =
    input.resumeFrom?.phase ??
    (completedPhases.length
      ? PRODUCTION_OS_V3_PHASE_ORDER[
          Math.min(completedPhases.length, PRODUCTION_OS_V3_PHASE_ORDER.length - 1)
        ]!
      : 'idea')

  const runtime: ProductionOsV3Runtime = {
    projectId: input.projectId,
    jobId: input.jobId,
    phase,
    completedPhases: [...completedPhases],
    scenes: input.resumeFrom
      ? mergeSceneCheckpoints(input.scenes, input.resumeFrom)
      : input.scenes,
    reports: [],
    framesRendered: 0,
    framesTotal: 0,
    renderSpeedFps: 0,
    startedAt: Date.now(),
    listeners: new Set(),
  }
  registry().set(input.jobId, runtime)
  return runtime
}

function mergeSceneCheckpoints(
  scenes: SceneProductionUnit[],
  checkpoint: ProductionOsV3Checkpoint
): SceneProductionUnit[] {
  const byId = new Map(checkpoint.scenes.map((s) => [s.id, s]))
  return scenes.map((s) => {
    const prev = byId.get(s.id)
    if (!prev) return s
    return {
      ...s,
      status: prev.status,
      checkpoint: prev.checkpoint,
      imageUrl: prev.imageUrl ?? s.imageUrl,
      videoUrl: prev.videoUrl ?? s.videoUrl,
    }
  })
}

export function getProductionJob(jobId: string): ProductionOsV3Runtime | null {
  return registry().get(jobId) ?? null
}

export function reportWorker(
  jobId: string,
  partial: Omit<ProductionWorkerReport, 'jobId' | 'at'> & { at?: number }
): ProductionWorkerReport {
  const runtime = registry().get(jobId)
  const report: ProductionWorkerReport = {
    ...partial,
    jobId,
    at: partial.at ?? Date.now(),
  }
  if (!runtime) return report

  runtime.reports.push(report)
  if (runtime.reports.length > 120) runtime.reports.splice(0, runtime.reports.length - 120)

  if (partial.framesRendered != null) runtime.framesRendered = partial.framesRendered
  if (partial.framesTotal != null) runtime.framesTotal = partial.framesTotal
  if (partial.fps != null) runtime.renderSpeedFps = partial.fps

  if (partial.status === 'completed' && !runtime.completedPhases.includes(partial.phase)) {
    runtime.completedPhases.push(partial.phase)
  }
  if (partial.status === 'running' || partial.status === 'queued') {
    runtime.phase = partial.phase
  }

  for (const listener of runtime.listeners) {
    try {
      listener(report)
    } catch {
      /* ignore */
    }
  }
  return report
}

export function completePhase(jobId: string, phase: ProductionOsV3PhaseId, message: string) {
  return reportWorker(jobId, {
    phase,
    status: 'completed',
    progress: 100,
    message,
  })
}

export function failWorker(
  jobId: string,
  phase: ProductionOsV3PhaseId,
  error: string,
  sceneId?: string
) {
  return reportWorker(jobId, {
    phase,
    sceneId,
    status: 'failed',
    progress: 0,
    errors: [error],
    message: error,
  })
}

export function snapshotProgress(jobId: string) {
  const runtime = registry().get(jobId)
  if (!runtime) {
    return computeV3Progress({
      completedPhases: [],
      currentPhase: 'idea',
      scenes: [],
    })
  }
  return computeV3Progress({
    completedPhases: runtime.completedPhases,
    currentPhase: runtime.phase,
    scenes: runtime.scenes,
    framesRendered: runtime.framesRendered,
    framesTotal: runtime.framesTotal,
    renderSpeedFps: runtime.renderSpeedFps,
    recentReports: runtime.reports,
  })
}

export function toCheckpoint(runtime: ProductionOsV3Runtime): ProductionOsV3Checkpoint {
  return {
    version: PRODUCTION_OS_V3,
    projectId: runtime.projectId,
    phase: runtime.phase,
    sceneIndex: runtime.scenes.findIndex((s) => s.status !== 'completed'),
    completedPhases: [...runtime.completedPhases],
    scenes: runtime.scenes.map((s) => ({
      id: s.id,
      status: s.status,
      checkpoint: s.checkpoint,
      imageUrl: s.imageUrl,
      videoUrl: s.videoUrl,
    })),
    characterRef: null,
    environmentRef: null,
    updatedAt: Date.now(),
  }
}

export function subscribeJob(jobId: string, listener: Listener): () => void {
  const runtime = registry().get(jobId)
  if (!runtime) return () => {}
  runtime.listeners.add(listener)
  return () => runtime.listeners.delete(listener)
}

export function mapStatus(status: ProductionJobStatus): ProductionJobStatus {
  return status
}
