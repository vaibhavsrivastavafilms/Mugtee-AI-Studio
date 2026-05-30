'use client'
// Mugtee PWA — Branded "Install App" prompt.
//
// Why: Chrome's default install pill is small and easy to miss. A cinematic,
// brand-styled prompt converts ~2-4x more installs on Android — critical before
// Play Store launch. Desktop and iOS fall back to the system UX (no-op here).
//
// Behaviour:
//   • Listens for `beforeinstallprompt` (Android Chrome/Edge only)
//   • Suppresses Chrome's mini-infobar via preventDefault, fires our own UI
//   • Auto-hides if: already standalone, already installed, browser unsupported,
//     user dismissed in the last 14 days
//   • Tracks: install_prompt_shown, install_accepted, install_dismissed
//   • Zero deps, ~2KB gzipped, fixed at bottom — never overlaps controls.

import { useEffect, useState } from 'react'
import { track } from '@/lib/posthog'

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'mugtee:install-prompt:dismissed-at'
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

function isStandalone() {
  if (typeof window === 'undefined') return false
  // PWA installed → display-mode is standalone (or iOS navigator.standalone)
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.startsWith('android-app://')
  )
}

function recentlyDismissed() {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return ts > 0 && Date.now() - ts < DISMISS_TTL_MS
  } catch {
    return false
  }
}

export function InstallPrompt() {
  const [event, setEvent] = useState<BIPEvent | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone() || recentlyDismissed()) return

    const onBIP = (e: Event) => {
      e.preventDefault() // suppress Chrome's mini-infobar
      const bip = e as BIPEvent
      setEvent(bip)
      // Defer the visible CTA so it never causes layout shift at first paint.
      window.setTimeout(() => {
        setOpen(true)
        track('install_prompt_shown', { source: 'beforeinstallprompt' })
      }, 1800)
    }

    const onInstalled = () => {
      setOpen(false)
      setEvent(null)
      track('install_completed', { source: 'appinstalled' })
    }

    window.addEventListener('beforeinstallprompt', onBIP as EventListener)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP as EventListener)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const accept = async () => {
    if (!event || busy) return
    setBusy(true)
    try {
      await event.prompt()
      const choice = await event.userChoice
      if (choice.outcome === 'accepted') {
        track('install_accepted', { platform: choice.platform })
      } else {
        track('install_dismissed', { platform: choice.platform, via: 'native_choice' })
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
      }
    } catch {
      // user cancelled or browser blocked — treat as soft dismiss
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    } finally {
      setBusy(false)
      setOpen(false)
      setEvent(null)
    }
  }

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    track('install_dismissed', { via: 'later_button' })
    setOpen(false)
  }

  if (!open || !event) return null

  return (
    <div
      role="dialog"
      aria-label="Install Mugtee AI Studio"
      className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div
        className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-[#D4AF37]/25 bg-[#0B0B0B]/95 backdrop-blur-xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.6)] p-3.5 flex items-center gap-3"
        style={{ boxShadow: '0 12px 40px -8px rgba(212,175,55,0.18), 0 20px 60px -12px rgba(0,0,0,0.6)' }}
      >
        {/* Brand tile — reuses /icons asset, no new image dep */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg text-[#0B0B0B]"
          style={{ background: 'linear-gradient(180deg,#E0C06E,#B48E3C)' }}
          aria-hidden
        >
          M
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#E8D9A8] leading-tight">
            Install Mugtee AI Studio
          </p>
          <p className="text-[11px] text-[#E8D9A8]/60 leading-snug mt-0.5">
            Faster · offline · native feel
          </p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 h-9 px-2.5 rounded-full text-[12px] text-[#E8D9A8]/70 hover:text-[#E8D9A8] transition"
        >
          Later
        </button>
        <button
          type="button"
          onClick={accept}
          disabled={busy}
          className="shrink-0 h-9 px-3.5 rounded-full text-[12px] font-semibold text-[#0B0B0B] disabled:opacity-60 transition active:scale-[0.98]"
          style={{ background: 'linear-gradient(180deg,#E0C06E,#B48E3C)' }}
        >
          {busy ? 'Opening…' : 'Install'}
        </button>
      </div>
    </div>
  )
}

export default InstallPrompt
