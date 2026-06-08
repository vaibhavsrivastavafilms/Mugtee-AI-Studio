/** Calibrated mix levels — voice -3 dB, music -18 dB with speech ducking. */
export const VOICE_MIX_GAIN = Math.pow(10, -3 / 20)
export const MUSIC_MIX_GAIN = Math.pow(10, -18 / 20)
export const MUSIC_DUCK_RATIO = 0.32

export type SpeechRange = { startSec: number; endSec: number }

export function isInSpeechRange(timeSec: number, ranges: SpeechRange[]): boolean {
  return ranges.some((r) => timeSec >= r.startSec && timeSec < r.endSec)
}

export function voiceVolumeAtFrame(frame: number, fps: number): number {
  void frame
  void fps
  return VOICE_MIX_GAIN
}

export function musicVolumeAtFrame(
  frame: number,
  fps: number,
  speechRanges: SpeechRange[]
): number {
  const timeSec = frame / fps
  const inSpeech = speechRanges.length > 0 && isInSpeechRange(timeSec, speechRanges)
  return inSpeech ? MUSIC_MIX_GAIN * MUSIC_DUCK_RATIO : MUSIC_MIX_GAIN
}
