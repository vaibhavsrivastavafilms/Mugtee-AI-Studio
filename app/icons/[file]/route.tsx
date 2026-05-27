// Mugtee PWA icons — serve static assets from /public/icons for standalone builds.
// Avoids @vercel/og ImageResponse prerender failures on Windows CI/local builds.
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const dynamic = 'force-static'
export const runtime = 'nodejs'

const FILES: Record<string, { file: string; type: string }> = {
  'icon-192.png': { file: 'icon-192.png', type: 'image/png' },
  'icon-512.png': { file: 'icon-512.png', type: 'image/png' },
  'icon-512-maskable.png': { file: 'icon-512.png', type: 'image/png' },
  'apple-touch-icon.png': { file: 'apple-icon.png', type: 'image/png' },
  'favicon-32.png': { file: 'icon.png', type: 'image/png' },
}

export function generateStaticParams() {
  return Object.keys(FILES).map((file) => ({ file }))
}

export async function GET(_req: Request, ctx: { params: { file: string } }) {
  const spec = FILES[ctx.params.file]
  if (!spec) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const body = await readFile(path.join(process.cwd(), 'public', 'icons', spec.file))
    return new Response(body, {
      headers: {
        'Content-Type': spec.type,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
