export type ReelSceneMotion = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right'

export type ReelSceneInput = {
  id: string
  imageSrc: string
  durationSec: number
  caption: string
  motion: ReelSceneMotion
}

export type ReelCompositionProps = {
  title: string
  scenes: ReelSceneInput[]
  voiceAudioSrc: string | null
  musicAudioSrc: string | null
  voiceVolume?: number
  musicVolume?: number
}

export const defaultReelProps: ReelCompositionProps = {
  title: 'Mugtee Reel',
  scenes: [],
  voiceAudioSrc: null,
  musicAudioSrc: null,
  voiceVolume: 1,
  musicVolume: 0.18,
}
