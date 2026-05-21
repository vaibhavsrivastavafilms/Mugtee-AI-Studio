'use client'
// MUGTEE V4.0 — Lightweight analytics layer.
//
// Dual-writes every event:
//   1. PostHog (frontend product analytics) — only when NEXT_PUBLIC_POSTHOG_KEY is set
//   2. Supabase `analytics_events` (first-party storage)
//
// `track()` is fire-and-forget and never blocks UX. Safe to call before PostHog
// boots; events queue then flush.
//
// Public surface:
//   • initPostHog()        — called once from the root layout (client-only)
//   • track(event, props)  — the only function feature code needs to import
//   • identify(user)       — link the anon session to a Supabase user after login

import posthog from 'posthog-js'

const SESSION_KEY = 'mugtee:analytics-session:v1'
let posthogReady = false
let sessionId: string | null = null

function ensureSession(): string {
  if (sessionId) return sessionId
  if (typeof window === 'undefined') return ''
  try {
    const cached = sessionStorage.getItem(SESSION_KEY)
    if (cached) { sessionId = cached; return cached }
    const fresh = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2,10)}`)
    sessionStorage.setItem(SESSION_KEY, fresh)
    sessionId = fresh
    return fresh
  } catch { return '' }
}

export function initPostHog() {
  if (typeof window === 'undefined' || posthogReady) return
  ensureSession()
  const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
  if (!key) {
    // No PostHog key — first-party logging still runs via /api/analytics/track.
    posthogReady = true
    return
  }
  try {
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,         // We send our own visitor_opened_site below.
      capture_pageleave: true,
      persistence: 'localStorage',
      autocapture: false,              // Keep bundle small; we instrument the events we care about.
      loaded: () => { posthogReady = true },
    })
  } catch {
    posthogReady = true
  }
}

export function identify(userId: string, props?: Record<string, any>) {
  if (typeof window === 'undefined') return
  try {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) posthog.identify(userId, props)
  } catch {}
}

export function track(event: string, properties: Record<string, any> = {}) {
  if (typeof window === 'undefined') return
  const session = ensureSession()
  // ---- 1. PostHog (optional) ----
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    try { posthog.capture(event, properties) } catch {}
  }
  // ---- 2. First-party Supabase log via /api/analytics/track ----
  try {
    const body = {
      event_type: event,
      session_id: session,
      url:        typeof location !== 'undefined' ? location.pathname + location.search : null,
      referrer:   typeof document !== 'undefined' ? document.referrer || null : null,
      device:     typeof navigator !== 'undefined' ? (/mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop') : null,
      metadata:   properties || {},
    }
    // Use keepalive so the request survives page navigations (export, redirect, etc).
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}
