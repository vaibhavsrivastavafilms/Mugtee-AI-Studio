import 'server-only'

import fs from 'fs/promises'
import { spawn } from 'child_process'
import { resolveFfmpegPath } from '@/lib/video/ffmpeg-path.server'
import { validateLocalVideoFile } from '@/lib/v7/providers/video-provider-base.server'

const MIN_FINAL_BYTES = 8_192

function parseAudioStream(stderr: string): boolean {
  return /Audio:\s*[^\n,]+/i.test(stderr)
}

function parseVideoResolution(stderr: string): { width?: number; height?: number } {
  const match = stderr.match(/Video:[^\n]*?(\d{2,5})x(\d{2,5})/i)
  if (!match) return {}
  const width = Number.parseInt(match[1]!, 10)
  const height = Number.parseInt(match[2]!, 10)
  if (!Number.isFinite(width) || !Number.isFinite(height)) return {}
  return { width, height }
}

async function readFfmpegProbe(filePath: string): Promise<string> {
  const bin = resolveFfmpegPath()
  if (!bin) return ''

  return new Promise((resolve, reject) => {
    const proc = spawn(bin, ['-hide_banner', '-i', filePath], { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', () => resolve(stderr))
  })
}

export async function validateFinalDeliverableMp4(params: {
  filePath: string
  expectedWidth: number
  expectedHeight: number
  expectedFps?: number
  requireAudio?: boolean
  expectedDurationSec?: number
}): Promise<{ valid: boolean; issues: string[]; durationSec: number }> {
  const issues: string[] = []

  try {
    const stat = await fs.stat(params.filePath)
    if (!stat.isFile() || stat.size < MIN_FINAL_BYTES) {
      issues.push('file missing or too small')
      return { valid: false, issues, durationSec: 0 }
    }
  } catch {
    issues.push('file missing or too small')
    return { valid: false, issues, durationSec: 0 }
  }

  const base = await validateLocalVideoFile(params.filePath, params.expectedDurationSec)
  if (!base.valid) {
    issues.push(base.error ?? 'video validation failed')
    return { valid: false, issues, durationSec: base.durationSec }
  }

  const stderr = await readFfmpegProbe(params.filePath)
  const { width, height } = parseVideoResolution(stderr)
  if (width !== params.expectedWidth || height !== params.expectedHeight) {
    issues.push(
      `resolution mismatch (expected ${params.expectedWidth}x${params.expectedHeight}, got ${width ?? '?'}x${height ?? '?'})`
    )
  }

  if (params.requireAudio !== false && !parseAudioStream(stderr)) {
    issues.push('audio stream missing')
  }

  if (params.expectedFps != null && params.expectedFps > 0) {
    const fpsMatch = stderr.match(/(\d+(?:\.\d+)?)\s*fps/i)
    if (fpsMatch) {
      const fps = Number.parseFloat(fpsMatch[1]!)
      if (Number.isFinite(fps) && Math.abs(fps - params.expectedFps) > 1.5) {
        issues.push(`fps mismatch (expected ~${params.expectedFps}, got ${fps})`)
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    durationSec: base.durationSec,
  }
}
