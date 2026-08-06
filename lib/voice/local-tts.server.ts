import 'server-only'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { resolveFfmpegPath } from '@/lib/video/ffmpeg-path.server'
import { logError } from '@/lib/workspace/validation'

export function isKokoroConfigured(): boolean {
  return Boolean(process.env.KOKORO_TTS_URL?.trim())
}

export function isPiperConfigured(): boolean {
  return Boolean(process.env.PIPER_MODEL_PATH?.trim())
}

/** OpenAI-compatible Kokoro / local TTS HTTP endpoint (e.g. kokoro-fastapi). */
export async function synthesizeKokoroTts(text: string): Promise<Buffer | null> {
  const base = process.env.KOKORO_TTS_URL?.trim()
  if (!base || !text.trim()) return null

  const url = base.includes('/v1/audio/speech')
    ? base
    : `${base.replace(/\/$/, '')}/v1/audio/speech`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.KOKORO_MODEL?.trim() || 'kokoro',
        input: text.slice(0, 4000),
        voice: process.env.KOKORO_VOICE?.trim() || 'af_heart',
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(120_000),
    })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    return buffer.length > 256 ? buffer : null
  } catch (err) {
    logError('local-tts.kokoro', err)
    return null
  }
}

/** Piper CLI — local open-source TTS (converts to MP3 when FFmpeg is available). */
export async function synthesizePiperTts(text: string): Promise<Buffer | null> {
  const modelPath = process.env.PIPER_MODEL_PATH?.trim()
  const piperBin = process.env.PIPER_BIN?.trim() || 'piper'
  if (!modelPath || !text.trim()) return null

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-piper-'))
  const wavPath = path.join(workDir, 'voice.wav')
  const mp3Path = path.join(workDir, 'voice.mp3')

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(piperBin, ['--model', modelPath, '--output_file', wavPath], {
        stdio: ['pipe', 'ignore', 'pipe'],
      })
      let stderr = ''
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })
      proc.stdin?.write(text.slice(0, 4000))
      proc.stdin?.end()
      proc.on('error', reject)
      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(stderr.slice(-400) || `piper exited ${code}`))
      })
    })

    const ffmpeg = resolveFfmpegPath()
    if (ffmpeg) {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(
          ffmpeg,
          ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-q:a', '4', mp3Path],
          { stdio: 'ignore' }
        )
        proc.on('error', reject)
        proc.on('close', (code) => {
          if (code === 0) resolve()
          else reject(new Error(`ffmpeg piper conversion failed (${code})`))
        })
      })
      const mp3 = await fs.readFile(mp3Path)
      return mp3.length > 256 ? mp3 : null
    }

    const wav = await fs.readFile(wavPath)
    return wav.length > 256 ? wav : null
  } catch (err) {
    logError('local-tts.piper', err)
    return null
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
