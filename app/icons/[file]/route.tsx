// Mugtee PWA icons — serve static assets from /public/icons for standalone builds.
// Avoids @vercel/og ImageResponse prerender failures on Windows CI/local builds.
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const dynamic = 'force-static'
export const runtime = 'nodejs'

const ICON_SOURCE = 'icon.png'

const FILES: Record<string, string> = {
  'icon.png': ICON_SOURCE,
  'icon-192.png': ICON_SOURCE,
  'icon-512.png': ICON_SOURCE,
  'icon-512-maskable.png': ICON_SOURCE,
  'apple-touch-icon.png': ICON_SOURCE,
  'apple-icon.png': ICON_SOURCE,
  'favicon-32.png': ICON_SOURCE,
}

export function generateStaticParams() {
  return Object.keys(FILES).map((file) => ({ file }))
}

export async function GET(_req: Request, ctx: { params: { file: string } }) {
  const source = FILES[ctx.params.file]
  if (!source) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const body = await readFile(path.join(process.cwd(), 'public', 'icons', source))
    return new Response(body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
