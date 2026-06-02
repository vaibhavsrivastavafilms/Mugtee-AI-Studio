import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'

/** @deprecated Prefer `requireAuth` from `@/lib/auth/require-auth`. */
export async function requireCinematicUser() {
  return requireAuth()
}

export function parseJsonBody(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      body: null,
      response: NextResponse.json(
        { error: 'Body must be a JSON object' },
        { status: 400 }
      ),
    }
  }
  return { body: raw as Record<string, unknown>, response: null }
}
