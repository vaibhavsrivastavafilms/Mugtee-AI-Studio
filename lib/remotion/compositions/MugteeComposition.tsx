// Edge Tools no-inline-styles suppressed via .hintrc (Remotion requires inline styles).
import React from 'react'
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig } from 'remotion'
import { ReelScene } from './ReelScene'
import type { ReelCompositionProps, ReelSceneInput } from './types'
import { REEL_FPS } from './constants'
import type { TimelineCaptionClip } from '@/types/timeline'
import type { WordTiming } from '@/lib/cinematic/captions/word-timing'

const CROSS_DISSOLVE_OVERLAP = 18

function activeWordAtTime(words: WordTiming[], timeSec: number): string | null {
  const hit = words.find((w) => timeSec >= w.startSec && timeSec < w.endSec)
  return hit?.text ?? words[words.length - 1]?.text ?? null
}

export type MugteeCompositionProps = ReelCompositionProps & {
  captionTracks?: TimelineCaptionClip[]
  resolution?: { width: number; height: number }
}

function TikTokCaption({ tracks }: { tracks: TimelineCaptionClip[] }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const timeSec = frame / fps

  const active = tracks.find(
    (t) => timeSec >= t.startSec && timeSec < t.endSec && t.text.trim()
  )
  if (!active) return null

  const displayText = active.words?.length
    ? activeWordAtTime(active.words, timeSec) ?? active.text
    : active.text

  const isTikTok = active.style !== 'minimal'

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: isTikTok ? 140 : 80,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      <div
        style={{
          maxWidth: '92%',
          textAlign: 'center',
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          fontWeight: isTikTok ? 800 : 600,
          fontSize: isTikTok ? 42 : 32,
          lineHeight: 1.15,
          color: '#fff',
          textTransform: isTikTok ? 'uppercase' : 'none',
          letterSpacing: isTikTok ? 0.02 : 0,
          WebkitTextStroke: isTikTok ? '2px rgba(0,0,0,0.85)' : undefined,
          paintOrder: 'stroke fill',
          textShadow: isTikTok
            ? '0 2px 12px rgba(0,0,0,0.9)'
            : '0 1px 8px rgba(0,0,0,0.7)',
        }}
      >
        {displayText}
      </div>
    </AbsoluteFill>
  )
}

export function MugteeComposition({
  scenes,
  voiceAudioSrc,
  musicAudioSrc,
  voiceVolume = 1,
  musicVolume = 0.18,
  captionTracks = [],
}: MugteeCompositionProps) {
  const { durationInFrames } = useVideoConfig()

  let cursor = 0

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0807' }}>
      {scenes.map((scene: ReelSceneInput, index: number) => {
        const durationInSceneFrames = Math.max(
          REEL_FPS * 2,
          Math.round(scene.durationSec * REEL_FPS)
        )
        const prev = scenes[index - 1]
        const overlap =
          index > 0 &&
          (scene.motionConfig?.transitionType === 'cross_dissolve' ||
            prev?.motionConfig?.transitionType === 'cross_dissolve')
            ? CROSS_DISSOLVE_OVERLAP
            : 0
        const from = index === 0 ? 0 : Math.max(0, cursor - overlap)
        cursor = from + durationInSceneFrames

        return (
          <Sequence
            key={scene.id || `scene-${index}`}
            from={from}
            durationInFrames={durationInSceneFrames}
          >
            <ReelScene scene={scene} sceneIndex={index} />
          </Sequence>
        )
      })}

      {captionTracks.length > 0 ? <TikTokCaption tracks={captionTracks} /> : null}

      {voiceAudioSrc ? (
        <Audio
          src={voiceAudioSrc}
          volume={voiceVolume}
          startFrom={0}
          endAt={durationInFrames}
        />
      ) : null}

      {musicAudioSrc ? (
        <Audio
          src={musicAudioSrc}
          volume={musicVolume}
          startFrom={0}
          endAt={durationInFrames}
        />
      ) : null}
    </AbsoluteFill>
  )
}

export function mugteeDurationInFrames(scenes: ReelSceneInput[]): number {
  const totalSec = scenes.reduce((sum, s) => sum + Math.max(2, s.durationSec), 0)
  return Math.max(REEL_FPS * 4, Math.round(totalSec * REEL_FPS))
}
