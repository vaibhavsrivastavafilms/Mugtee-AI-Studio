import { ImageResponse } from 'next/og'

export const alt = 'Mugtee \u00b7 AI Production OS for Creators'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          padding: 80, fontFamily: 'system-ui', color: '#E8D9A8',
          backgroundColor: '#0a0807',
          backgroundImage: 'radial-gradient(ellipse at 25% 20%, rgba(212,175,55,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(245,208,97,0.10) 0%, transparent 55%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 60 }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: 14,
              background: 'linear-gradient(135deg, #F5D061 0%, #D4AF37 60%, #A87A1E 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(212,175,55,0.35)',
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 900, color: '#0a0807', display: 'flex' }}>M</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 16, letterSpacing: 8, color: 'rgba(245,208,97,0.7)', textTransform: 'uppercase', display: 'flex' }}>Mugtee</div>
            <div style={{ fontSize: 13, letterSpacing: 4, color: 'rgba(232,217,168,0.5)', textTransform: 'uppercase', display: 'flex' }}>est. 2025</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, justifyContent: 'center' }}>
          <div
            style={{
              fontSize: 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3, display: 'flex', flexWrap: 'wrap',
              color: '#fffaf0',
            }}
          >
            AI&nbsp;Production&nbsp;OS
          </div>
          <div
            style={{
              fontSize: 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3, display: 'flex',
              background: 'linear-gradient(135deg, #F5D061 0%, #D4AF37 60%, #A87A1E 100%)',
              backgroundClip: 'text', color: 'transparent',
            }}
          >
            for Creators.
          </div>
          <div style={{ fontSize: 28, color: 'rgba(232,217,168,0.65)', marginTop: 14, display: 'flex', maxWidth: 920 }}>
            Plan · Script · Schedule · Scale. A cinematic workspace for viral content.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(212,175,55,0.18)', paddingTop: 24 }}>
          <div style={{ display: 'flex', gap: 24, fontSize: 18, color: 'rgba(232,217,168,0.55)', letterSpacing: 2, textTransform: 'uppercase' }}>
            <span style={{ display: 'flex' }}>Kanban</span>
            <span style={{ display: 'flex' }}>·</span>
            <span style={{ display: 'flex' }}>Calendar</span>
            <span style={{ display: 'flex' }}>·</span>
            <span style={{ display: 'flex' }}>Faceless AI</span>
            <span style={{ display: 'flex' }}>·</span>
            <span style={{ display: 'flex' }}>YouTube Intel</span>
          </div>
          <div style={{ fontSize: 18, color: 'rgba(245,208,97,0.9)', letterSpacing: 3, textTransform: 'uppercase', display: 'flex' }}>mugtee.in</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
