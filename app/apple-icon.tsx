import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 35%, #2a1f0e 0%, #0a0807 75%)',
          borderRadius: 40,
        }}
      >
        <div
          style={{
            fontSize: 120, fontWeight: 800, letterSpacing: -4,
            background: 'linear-gradient(135deg, #F5D061 0%, #D4AF37 60%, #A87A1E 100%)',
            backgroundClip: 'text', color: 'transparent',
            display: 'flex', lineHeight: 1, fontFamily: 'system-ui',
          }}
        >
          M
        </div>
      </div>
    ),
    { ...size }
  )
}
