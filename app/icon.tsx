import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// Cinematic black + gold-gradient "V" mark for Mugtee.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 35%, #2a1f0e 0%, #0a0807 75%)',
          borderRadius: 7,
        }}
      >
        <div
          style={{
            fontSize: 22, fontWeight: 800, letterSpacing: -1,
            background: 'linear-gradient(135deg, #F5D061 0%, #D4AF37 60%, #A87A1E 100%)',
            backgroundClip: 'text', color: 'transparent',
            display: 'flex', lineHeight: 1, fontFamily: 'system-ui',
          }}
        >
          V
        </div>
      </div>
    ),
    { ...size }
  )
}
