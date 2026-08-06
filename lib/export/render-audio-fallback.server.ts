import 'server-only'

import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { downloadVoiceAssetForRender } from '@/lib/export/project-asset-download.server'
import { resolveFfmpegPath } from '@/lib/video/ffmpeg-path.server'
import { renderPipelineLog } from '@/lib/export/render-pipeline-log.server'

const MIN_AUDIO_BYTES = 128

export type ValidatedAudioFile = {
  valid: boolean
  durationSec: number
  codec?: string
  sizeBytes: number
  error?: string
}

async function statFile(filePath: string): Promise<{ size: number } | null> {
  try {
    const stat = await fs.stat(filePath)
    if (!stat.isFile() || stat.size <= 0) return null
    return { size: stat.size }
  } catch {
    return null
  }
}

function parseDurationFromFfmpegStderr(stderr: string): number | null {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!match) return null
  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)
  const seconds = Number.parseFloat(match[3])
  if (!Number.isFinite(hours + minutes + seconds)) return null
  return hours * 3600 + minutes * 60 + seconds
}

function parseAudioCodecFromFfmpegStderr(stderr: string): string | undefined {
  const match = stderr.match(/Audio:\s*([^,\n]+)/)
  return match?.[1]?.trim()
}

function spawnCommand(
  bin: string,
  args: string[],
  captureStderr = false
): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, {
      stdio: ['ignore', 'pipe', captureStderr ? 'pipe' : 'ignore'],
    })
    let stderr = ''
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', (code) => resolve({ code, stderr }))
  })
}

/** Verify a local audio file is decodable and has positive duration. */
export async function validateAudioFileForRender(filePath: string): Promise<ValidatedAudioFile> {
  const stat = await statFile(filePath)
  if (!stat) {
    return { valid: false, durationSec: 0, sizeBytes: 0, error: 'missing_or_empty' }
  }
  if (stat.size < MIN_AUDIO_BYTES) {
    return {
      valid: false,
      durationSec: 0,
      sizeBytes: stat.size,
      error: 'file_too_small',
    }
  }

  const bin = resolveFfmpegPath()
  if (!bin) {
    return {
      valid: false,
      durationSec: 0,
      sizeBytes: stat.size,
      error: 'ffmpeg_unavailable',
    }
  }

  const probe = await spawnCommand(bin, ['-hide_banner', '-i', filePath], true)
  const durationSec = parseDurationFromFfmpegStderr(probe.stderr) ?? 0
  const codec = parseAudioCodecFromFfmpegStderr(probe.stderr)

  if (!codec || durationSec <= 0) {
    return {
      valid: false,
      durationSec,
      codec,
      sizeBytes: stat.size,
      error: 'invalid_audio_headers_or_duration',
    }
  }

  const decode = await spawnCommand(
    bin,
    ['-v', 'error', '-i', filePath, '-f', 'null', '-'],
    true
  )
  if (decode.code !== 0) {
    return {
      valid: false,
      durationSec,
      codec,
      sizeBytes: stat.size,
      error: decode.stderr.slice(-400) || 'decode_failed',
    }
  }

  return {
    valid: true,
    durationSec,
    codec,
    sizeBytes: stat.size,
  }
}

function runFfmpegOnce(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = resolveFfmpegPath()
    if (!bin) {
      reject(new Error('FFmpeg binary not found. Install ffmpeg-static or set FFMPEG_PATH.'))
      return
    }
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString().slice(-2000)
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.slice(-800) || `ffmpeg exited with code ${code}`))
    })
  })
}

async function generateSilentTrack(destPath: string, durationSec: number): Promise<void> {
  const dur = Math.max(0.1, Math.min(durationSec, 600))
  await runFfmpegOnce([
    '-y',
    '-f',
    'lavfi',
    '-i',
    'anullsrc=r=44100:cl=stereo',
    '-t',
    String(dur),
    '-acodec',
    'libmp3lame',
    '-q:a',
    '2',
    destPath,
  ])
}

async function generateValidatedSilentTrack(
  destPath: string,
  durationSec: number,
  attempt: number
): Promise<ValidatedAudioFile> {
  await generateSilentTrack(destPath, durationSec)
  const validation = await validateAudioFileForRender(destPath)
  if (validation.valid) return validation

  renderPipelineLog('RENDER_PREP', {
    phase: 'voice_audio_resolved',
    source: 'generated_silence',
    path: destPath,
    attempt,
    status: 'invalid',
    error: validation.error,
  })

  if (attempt >= 2) {
    throw new Error(
      validation.error || 'Unable to generate valid silent audio track for render'
    )
  }

  return generateValidatedSilentTrack(destPath, durationSec, attempt + 1)
}

export type ResolveVoiceAudioResult = {
  path: string
  source: 'voice' | 'generated_silence'
}

/**
 * Ensures a decodable local audio track exists before FFmpeg/Remotion assembly.
 * Fallback order: valid narration asset → FFmpeg-generated silence (never fake stubs).
 */
export async function resolveVoiceAudioPathForRender(params: {
  workDir: string
  voiceUrl?: string | null
  voiceAssetPath?: string | null
  durationSec: number
}): Promise<ResolveVoiceAudioResult> {
  await fs.mkdir(params.workDir, { recursive: true })
  const voicePath = path.join(params.workDir, 'voice.mp3')
  const silentPath = path.join(params.workDir, 'silent.mp3')

  if (params.voiceUrl?.trim() || params.voiceAssetPath?.trim()) {
    try {
      await downloadVoiceAssetForRender({
        url: params.voiceUrl,
        assetPath: params.voiceAssetPath,
        destPath: voicePath,
      })
      const validation = await validateAudioFileForRender(voicePath)
      if (validation.valid) {
        renderPipelineLog('RENDER_PREP', {
          phase: 'voice_audio_resolved',
          source: 'voice',
          path: voicePath,
          durationSec: validation.durationSec,
          codec: validation.codec,
          sizeBytes: validation.sizeBytes,
          status: 'ready',
        })
        return { path: voicePath, source: 'voice' }
      }
      renderPipelineLog('RENDER_PREP', {
        phase: 'voice_audio_resolved',
        source: 'voice',
        path: voicePath,
        status: 'invalid',
        error: validation.error,
      })
    } catch (err) {
      renderPipelineLog('RENDER_PREP', {
        phase: 'voice_audio_resolved',
        source: 'voice',
        status: 'missing',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const silentValidation = await generateValidatedSilentTrack(silentPath, params.durationSec, 1)
  renderPipelineLog('RENDER_PREP', {
    phase: 'voice_audio_resolved',
    source: 'generated_silence',
    path: silentPath,
    durationSec: silentValidation.durationSec,
    codec: silentValidation.codec,
    sizeBytes: silentValidation.sizeBytes,
    status: 'ready',
  })
  return { path: silentPath, source: 'generated_silence' }
}

/** Never pass a missing or corrupt path to FFmpeg. */
export async function ensureRenderAudioPath(params: {
  audioPath: string | null
  workDir: string
  durationSec: number
  voiceUrl?: string | null
  voiceAssetPath?: string | null
}): Promise<string | null> {
  if (params.audioPath) {
    const validation = await validateAudioFileForRender(params.audioPath)
    if (validation.valid) return params.audioPath
    renderPipelineLog('RENDER_PREP', {
      phase: 'render_audio_validate',
      path: params.audioPath,
      status: 'invalid',
      error: validation.error,
    })
  }

  if (params.audioPath || params.voiceUrl?.trim() || params.voiceAssetPath?.trim()) {
    const resolved = await resolveVoiceAudioPathForRender({
      workDir: params.workDir,
      voiceUrl: params.voiceUrl,
      voiceAssetPath: params.voiceAssetPath,
      durationSec: params.durationSec,
    })
    return resolved.path
  }

  if (params.durationSec > 0) {
    const resolved = await resolveVoiceAudioPathForRender({
      workDir: params.workDir,
      voiceUrl: null,
      voiceAssetPath: null,
      durationSec: params.durationSec,
    })
    return resolved.path
  }

  return null
}
