import 'server-only'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getComfyUiBaseUrl(): string | undefined {
  return process.env.COMFYUI_BASE_URL?.trim() || process.env.COMFYUI_URL?.trim() || undefined
}

export function hasComfyUiUrl(): boolean {
  return Boolean(getComfyUiBaseUrl())
}

type ComfyPromptResponse = {
  prompt_id?: string
  number?: number
  node_errors?: Record<string, unknown>
}

type ComfyHistoryEntry = {
  outputs?: Record<
    string,
    {
      images?: Array<{ filename?: string; subfolder?: string; type?: string }>
    }
  >
}

function buildTxt2ImgWorkflow(params: {
  prompt: string
  negativePrompt: string
  width: number
  height: number
  seed: number
}) {
  return {
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed: params.seed,
        steps: 20,
        cfg: 7,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name:
          process.env.COMFYUI_CHECKPOINT?.trim() ?? 'sd_xl_base_1.0.safetensors',
      },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { width: params.width, height: params.height, batch_size: 1 },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: params.prompt, clip: ['4', 1] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: params.negativePrompt, clip: ['4', 1] },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'mugtee_v7', images: ['8', 0] },
    },
  }
}

export async function checkComfyUiHealth(): Promise<{ healthy: boolean; message?: string }> {
  const base = getComfyUiBaseUrl()
  if (!base) return { healthy: false, message: 'COMFYUI_BASE_URL not configured' }

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/system_stats`, {
      signal: AbortSignal.timeout(4_000),
    })
    return { healthy: res.ok, message: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (err) {
    return {
      healthy: false,
      message: err instanceof Error ? err.message : 'ComfyUI unreachable',
    }
  }
}

export async function generateComfyUiImage(params: {
  prompt: string
  negativePrompt: string
  width: number
  height: number
  seed: number
}): Promise<string | null> {
  const base = getComfyUiBaseUrl()
  if (!base) return null

  const clientId = `mugtee-${Date.now()}`
  const workflow = buildTxt2ImgWorkflow(params)

  const promptRes = await fetch(`${base.replace(/\/$/, '')}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!promptRes.ok) {
    console.error('[IMAGE_ERROR] comfyui prompt', { status: promptRes.status })
    return null
  }

  const promptJson = (await promptRes.json().catch(() => null)) as ComfyPromptResponse | null
  const promptId = promptJson?.prompt_id
  if (!promptId) {
    console.error('[IMAGE_ERROR] comfyui', { reason: 'missing prompt_id', node_errors: promptJson?.node_errors })
    return null
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    await delay(2_000)
    const historyRes = await fetch(`${base.replace(/\/$/, '')}/history/${promptId}`, {
      signal: AbortSignal.timeout(15_000),
    })
    if (!historyRes.ok) continue

    const history = (await historyRes.json().catch(() => null)) as Record<
      string,
      ComfyHistoryEntry
    > | null
    const entry = history?.[promptId]
    const images = Object.values(entry?.outputs ?? {}).flatMap((o) => o.images ?? [])
    const image = images[0]
    if (!image?.filename) continue

    const viewUrl = new URL(`${base.replace(/\/$/, '')}/view`)
    viewUrl.searchParams.set('filename', image.filename)
    if (image.subfolder) viewUrl.searchParams.set('subfolder', image.subfolder)
    viewUrl.searchParams.set('type', image.type ?? 'output')

    const imgRes = await fetch(viewUrl.toString(), { signal: AbortSignal.timeout(30_000) })
    if (!imgRes.ok) continue

    const buffer = Buffer.from(await imgRes.arrayBuffer())
    if (buffer.length < 512) continue
    const mime = imgRes.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png'
    return `data:${mime};base64,${buffer.toString('base64')}`
  }

  console.error('[IMAGE_ERROR] comfyui poll timeout', { promptId })
  return null
}
