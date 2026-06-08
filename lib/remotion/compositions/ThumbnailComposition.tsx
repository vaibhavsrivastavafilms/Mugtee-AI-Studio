// Edge Tools no-inline-styles suppressed via .hintrc (Remotion requires inline styles).
import React from 'react'
import { AbsoluteFill, Img } from 'remotion'
import { REEL_HEIGHT, REEL_WIDTH } from './constants'

export type ThumbnailCompositionProps = {
  imageSrc: string
  title: string
  hook?: string
}

export function ThumbnailComposition({ imageSrc, title, hook }: ThumbnailCompositionProps) {
  const headline = (hook?.trim() || title?.trim() || 'Mugtee Reel').slice(0, 72)

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0807' }}>
      <AbsoluteFill style={{ transform: 'scale(1.08)' }}>
        <Img
          src={imageSrc}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.72) 68%, rgba(0,0,0,0.92) 100%)',
        }}
      />

      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '0 48px 120px',
        }}
      >
        <div
          style={{
            maxWidth: REEL_WIDTH - 96,
            textAlign: 'center',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 700,
            fontSize: 58,
            lineHeight: 1.08,
            color: '#F4E7C1',
            textShadow: '0 4px 24px rgba(0,0,0,0.95), 0 0 40px rgba(212,175,55,0.25)',
            letterSpacing: 0.01,
          }}
        >
          {headline}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

export const THUMBNAIL_COMPOSITION_ID = 'MugteeThumbnail'
export const thumbnailCompositionDefaults: ThumbnailCompositionProps = {
  imageSrc: '',
  title: 'Mugtee Reel',
  hook: '',
}
