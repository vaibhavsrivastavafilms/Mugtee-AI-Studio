import {
  buildMotionPrompt,
  motionPlanToParams,
  type SceneVideoInput,
  type SceneVideoJobStatus,
  type SceneVideoResult,
  type VideoProvider,
} from '@/lib/video/providers/video-provider'
import { logError } from '@/lib/workspace/validation'

const REPLICATE_API_BASE = 'https://api.replicate.com/v1'

/** Stable Video Diffusion — image-to-video */
const SVD_MODEL_VERSION =
  process.env.REPLICATE_SVD_VERSION?.trim() ||
  '3f0457e4619daac51203dedb1a4f47f3442e0fff4369654e8bfc5fd87094c4d2'

type ReplicatePrediction = {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[] | null
  error?: string | null
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getReplicateApiToken(): string | undefined {
  return process.env.REPLICATE_API_TOKEN?.trim() || undefined
}

export function hasReplicateApiToken(): boolean {
  return Boolean(getReplicateApiToken())
}

function replicateHeaders(): HeadersInit {
  const token = getReplicateApiToken()
  if (!token) throw new Error('REPLICATE_API_TOKEN is not configured')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'wait',
  }
}

function motionBucketFromParams(input: SceneVideoInput): number {
  const params = motionPlanToParams(input.motionPlan)
  let bucket = 80

  if (params.zoom) bucket += Math.abs(params.zoom) * 60
  if (params.pan && params.pan !== 'none') bucket += 40
  if (params.drift) bucket += params.drift * 50
  if (params.dolly && params.dolly !== 'none') bucket += 35
  if (params.parallax) bucket += params.parallax * 45

  return Math.max(1, Math.min(255, Math.round(bucket)))
}

async function replicateFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${REPLICATE_API_BASE}${path}`, {
    ...init,
    headers: {
      ...replicateHeaders(),
      ...(init?.headers ?? {}),
    },
    signal: init?.signal ?? AbortSignal.timeout(120_000),
  })
}

export async function createReplicatePrediction(input: SceneVideoInput): Promise<string> {
  const motionPrompt = buildMotionPrompt(input.motionPlan, input.prompt)
  const motionBucket = motionBucketFromParams(input)

  const res = await replicateFetch('/predictions', {
    method: 'POST',
    body: JSON.stringify({
      version: SVD_MODEL_VERSION,
      input: {
        input_image: input.imageUrl,
        motion_bucket_id: motionBucket,
        fps: 24,
        cond_aug: 0.02,
        decoding_t: 14,
        video_length: '25_frames_with_svd_xt',
        sizing_strategy: 'maintain_aspect_ratio',
        motion_prompt: motionPrompt.slice(0, 500),
      },
    }),
  })

  const data = (await res.json().catch(() => ({}))) as ReplicatePrediction & Record<string, unknown>
  if (!res.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data)
    throw new Error(`Replicate prediction failed: ${detail}`)
  }
  if (!data.id) throw new Error('Replicate returned no prediction id')
  return data.id
}

export async function getReplicatePrediction(id: string): Promise<ReplicatePrediction> {
  const res = await replicateFetch(`/predictions/${id}`)
  const data = (await res.json().catch(() => ({}))) as ReplicatePrediction
  if (!res.ok) {
    throw new Error(data.error || `Replicate status failed (${res.status})`)
  }
  return data
}

export async function waitForReplicatePrediction(
  id: string,
  opts?: { maxAttempts?: number; intervalMs?: number }
): Promise<string> {
  const maxAttempts = opts?.maxAttempts ?? 120
  const intervalMs = opts?.intervalMs ?? 2500

  for (let i = 0; i < maxAttempts; i++) {
    const prediction = await getReplicatePrediction(id)
    if (prediction.status === 'succeeded') {
      const output = prediction.output
      if (typeof output === 'string' && output.trim()) return output.trim()
      if (Array.isArray(output) && typeof output[0] === 'string') return output[0].trim()
      throw new Error('Replicate succeeded but returned no video URL')
    }
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(prediction.error || `Replicate prediction ${prediction.status}`)
    }
    await delay(intervalMs)
  }

  throw new Error('Replicate prediction timed out')
}

export class ReplicateProvider implements VideoProvider {
  readonly name = 'replicate' as const

  async generateSceneVideo(input: SceneVideoInput): Promise<SceneVideoResult> {
    if (!hasReplicateApiToken()) {
      throw new Error('REPLICATE_API_TOKEN is not configured')
    }
    if (!input.imageUrl?.trim()) {
      throw new Error('Source image URL required for image-to-video')
    }

    const started = Date.now()
    const jobId = await createReplicatePrediction(input)
    const videoUrl = await waitForReplicatePrediction(jobId)

    return {
      videoUrl,
      provider: 'replicate',
      jobId,
      generationTimeMs: Date.now() - started,
    }
  }

  async getJobStatus(jobId: string): Promise<SceneVideoJobStatus> {
    try {
      const prediction = await getReplicatePrediction(jobId)
      let status: SceneVideoJobStatus['status'] = 'generating'
      if (prediction.status === 'starting' || prediction.status === 'processing') {
        status = 'generating'
      } else if (prediction.status === 'succeeded') {
        status = 'completed'
      } else {
        status = 'failed'
      }

      let videoUrl: string | null = null
      if (typeof prediction.output === 'string') videoUrl = prediction.output
      else if (Array.isArray(prediction.output)) videoUrl = prediction.output[0] ?? null

      return {
        jobId,
        status,
        videoUrl,
        errorMessage: prediction.error ?? null,
      }
    } catch (err) {
      logError('replicate.getJobStatus', err)
      return {
        jobId,
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Status check failed',
      }
    }
  }
}
