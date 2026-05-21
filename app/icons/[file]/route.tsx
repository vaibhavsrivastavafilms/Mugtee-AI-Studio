// Mugtee PWA icons — dynamic generation so they ship in Next.js standalone builds.
// Routes:
//   /icons/icon-192.png
//   /icons/icon-512.png
//   /icons/icon-512-maskable.png
//   /icons/apple-touch-icon.png
//   /icons/favicon-32.png
//
// All produced via ImageResponse (same engine as the existing /icon + /apple-icon).
import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'
export const runtime = 'nodejs'

const SIZES: Record<string, { w: number; h: number; mask: boolean }> = {
  'icon-192.png':          { w: 192, h: 192, mask: false },
  'icon-512.png':          { w: 512, h: 512, mask: false },
  'icon-512-maskable.png': { w: 512, h: 512, mask: true  },
  'apple-touch-icon.png':  { w: 180, h: 180, mask: false },
  'favicon-32.png':        { w: 32,  h: 32,  mask: false },
}

export function generateStaticParams() {
  return Object.keys(SIZES).map((file) => ({ file }))
}

export async function GET(_req: Request, ctx: { params: { file: string } }) {
  const spec = SIZES[ctx.params.file]
  if (!spec) {
    return new Response('Not found', { status: 404 })
  }
  const { w, h, mask } = spec
  // Maskable icons need an 80% safe zone — shrink the tile so launchers can crop it.
  const tilePad = mask ? Math.round(w * 0.18) : Math.round(w * 0.08)
  const tile = w - tilePad * 2
  const radius = Math.round(tile * 0.22)
  const fontSize = Math.round(tile * 0.62)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0B0B0B',
        }}
      >
        <div
          style={{
            width: tile, height: tile, borderRadius: radius,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(180deg, #E0C06E 0%, #B48E3C 100%)',
            boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.18)',
          }}
        >
          <div
            style={{
              fontSize, fontWeight: 800, letterSpacing: -Math.round(fontSize * 0.04),
              color: '#0B0B0B', display: 'flex', lineHeight: 1,
              fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
              transform: `translateY(-${Math.round(tile * 0.04)}px)`,
            }}
          >
            M
          </div>
        </div>
      </div>
    ),
    { width: w, height: h },
  )
}
