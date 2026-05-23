// Mugtee mascot — served via API route so it survives Next.js standalone
// builds (where /public is stripped) and avoids the dev-mode route-vs-public
// conflict that breaks /mascot.jpeg.
import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let cached: Buffer | null = null

function loadBytes(): Buffer | null {
  if (cached) return cached
  const candidates = [
    path.join(process.cwd(), 'public', 'mascot.jpeg'),
    path.join(process.cwd(), 'mascot.jpeg'),
  ]
  for (const p of candidates) {
    try {
      cached = readFileSync(p)
      return cached
    } catch {
      // try next candidate
    }
  }
  return null
}

export async function GET() {
  try {
    const bytes = loadBytes()
    if (!bytes) return new NextResponse('Not found', { status: 404 })
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e: any) {
    console.error('[mascot] serve error', e?.message)
    return new NextResponse('Mascot unavailable', { status: 500 })
  }
}
