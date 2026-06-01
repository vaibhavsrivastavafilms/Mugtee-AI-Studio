'use client'
// Mugtee PWA — Android install banner (Chrome / Edge).
// Listens for beforeinstallprompt, suppresses the mini-infobar, shows a branded CTA.

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { track } from '@/lib/posthog'

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'mugtee:install-mugtee-banner:dismissed'
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000

function isAndroidChromeOrEdge() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Android/i.test(ua) && /(Chrome|EdgA)/i.test(ua)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
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

export function InstallMugteeBanner() {
  const [event, setEvent] = useState<BIPEvent | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isAndroidChromeOrEdge()) return
    if (isStandalone() || recentlyDismissed()) return

    const onBIP = (e: Event) => {
      e.preventDefault()
      const bip = e as BIPEvent
      setEvent(bip)
      window.setTimeout(() => {
        setOpen(true)
        track('install_prompt_shown', { source: 'install_mugtee_banner' })
      }, 1600)
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

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {}
    track('install_dismissed', { via: 'banner_dismiss' })
    setOpen(false)
  }

  const install = async () => {
    if (!event || busy) return
    setBusy(true)
    try {
      await event.prompt()
      const choice = await event.userChoice
      if (choice.outcome === 'accepted') {
        track('install_accepted', { platform: choice.platform })
      } else {
        dismiss()
      }
    } catch {
      dismiss()
    } finally {
      setBusy(false)
      setOpen(false)
      setEvent(null)
    }
  }

  if (!open || !event) return null

  return (
    <div
      role="dialog"
      aria-label="Install Mugtee"
      className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-[#D4AF37]/25 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-[0_12px_40px_-8px_rgba(212,175,55,0.18)] p-3.5 flex items-center gap-3 min-w-0">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="w-11 h-11 rounded-xl shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#E8D9A8] leading-tight">Install Mugtee</p>
          <p className="text-[11px] text-[#E8D9A8]/60 mt-0.5">Add to home screen for a native feel</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 min-h-[44px] min-w-[44px] px-2 rounded-full text-[12px] text-[#E8D9A8]/70 hover:text-[#E8D9A8]"
          aria-label="Dismiss install banner"
        >
          Later
        </button>
        <button
          type="button"
          onClick={() => void install()}
          disabled={busy}
          className="shrink-0 min-h-[44px] px-4 rounded-full text-[12px] font-semibold text-[#0a0a0a] disabled:opacity-60 bg-gradient-to-b from-[#E0C06E] to-[#B48E3C]"
        >
          {busy ? '…' : 'Install'}
        </button>
      </div>
    </div>
  )
}

export default InstallMugteeBanner
