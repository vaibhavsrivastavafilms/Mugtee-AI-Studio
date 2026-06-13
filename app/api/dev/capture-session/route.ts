import fs from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AUTH_OUT = path.join(process.cwd(), 'e2e/.auth/user.json')

/** Dev-only — persist current browser session to e2e/.auth/user.json for execute scripts. */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available outside development' }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.response) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Sign in to Mugtee in this browser first, then reload this URL.',
      },
      { status: 401 }
    )
  }

  const host = req.nextUrl.hostname
  const cookieDomain = host === '0.0.0.0' ? 'localhost' : host
  const secure = req.nextUrl.protocol === 'https:'
  const cookies = req.cookies.getAll().map((c) => ({
    name: c.name,
    value: c.value,
    domain: cookieDomain,
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'Lax' as const,
  }))

  fs.mkdirSync(path.dirname(AUTH_OUT), { recursive: true })
  fs.writeFileSync(AUTH_OUT, JSON.stringify({ cookies, origins: [] }, null, 2), 'utf8')

  console.info(
    '[AUTH_VERIFY]',
    JSON.stringify({
      authenticated: true,
      userId: auth.user!.id,
      storageState: 'e2e/.auth/user.json',
      method: 'capture_session',
    })
  )

  return NextResponse.json({
    ok: true,
    authenticated: true,
    userId: auth.user!.id,
    email: auth.user!.email,
    storageState: 'e2e/.auth/user.json',
    next: 'Run: npm run test:execute',
  })
}
