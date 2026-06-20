import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rawOrigins = process.env.CORS_ORIGINS?.split(',').map((item) => item.trim()).filter(Boolean) ?? []

function resolveCorsOrigin(request: NextRequest): string | undefined {
  const origin = request.headers.get('origin')

  if (!origin) {
    if (rawOrigins.includes('*')) return '*'
    return rawOrigins[0] ?? '*'
  }

  if (rawOrigins.length === 0 || rawOrigins.includes('*')) {
    return origin
  }

  return rawOrigins.includes(origin) ? origin : undefined
}

function buildCorsHeaders(request: NextRequest): Headers {
  const headers = new Headers()
  const origin = resolveCorsOrigin(request)

  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin)
  }

  if (request.headers.get('origin')) {
    headers.set('Vary', 'Origin')
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  headers.set('Access-Control-Expose-Headers', 'Location, X-Total-Count')

  if (origin && origin !== '*') {
    headers.set('Access-Control-Allow-Credentials', 'true')
  }

  return headers
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const headers = buildCorsHeaders(request)

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers,
    })
  }

  const response = NextResponse.next()
  headers.forEach((value, key) => response.headers.set(key, value))
  return response
}

export const config = {
  matcher: '/api/:path*',
}
