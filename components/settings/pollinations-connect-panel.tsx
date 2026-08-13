'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Plug, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type PollinationsStatusResponse = {
  ok: boolean
  connected: boolean
  authenticated: boolean
  source: 'oauth' | 'api_key' | null
  pollenBalance: number | null
  expiresAt: string | null
  username: string | null
  error: string | null
  platformFallbackConfigured?: boolean
  appDirectoryReady?: boolean
  earningsReady?: boolean
  errorMessage?: string
}

export function PollinationsConnectPanel() {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<PollinationsStatusResponse | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/pollinations/status', { cache: 'no-store' })
      if (res.status === 401) {
        setStatus(null)
        return
      }
      const data = (await res.json()) as PollinationsStatusResponse
      setStatus(data.ok ? data : { ok: false, connected: false, authenticated: false, source: null, pollenBalance: null, expiresAt: null, username: null, error: 'status_failed' })
    } catch {
      setStatus({
        ok: false,
        connected: false,
        authenticated: false,
        source: null,
        pollenBalance: null,
        expiresAt: null,
        username: null,
        error: 'network',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    try {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get('pollinations_connected') === '1') {
        toast.success('Pollinations connected')
        window.history.replaceState({}, '', '/settings')
        void load()
      } else if (sp.get('pollinations_error')) {
        toast.error('Unable to connect Pollinations')
        window.history.replaceState({}, '', '/settings')
      }
    } catch {
      // ignore
    }
  }, [load])

  async function disconnect() {
    setBusy(true)
    try {
      const res = await fetch('/api/auth/pollinations/disconnect', { method: 'POST' })
      const data = (await res.json()) as { ok?: boolean }
      if (!res.ok || !data.ok) throw new Error('Disconnect failed')
      toast.success('Pollinations disconnected')
      await load()
    } catch {
      toast.error('Could not disconnect Pollinations')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-5">
        <div className="flex min-h-[44px] items-center text-sm text-white/45">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading Pollinations…
        </div>
      </section>
    )
  }

  if (!status) return null

  const connected = status.connected && status.authenticated
  const errored = Boolean(status.error) && status.connected

  return (
    <section className="overflow-x-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4AF37]/75">
            Pollinations BYOP
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Your Pollen account</h2>
          <p className="mt-1 text-sm text-white/50">
            Connect Pollinations so V7 image and video generations bill your authorized Pollen,
            not the platform developer wallet.
          </p>
        </div>
        {connected ? (
          <span className="inline-flex min-h-[44px] items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs text-emerald-200">
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Pollinations connected
          </span>
        ) : errored ? (
          <span className="inline-flex min-h-[44px] items-center rounded-full border border-red-500/30 bg-red-500/10 px-3 text-xs text-red-200">
            <AlertCircle className="mr-1.5 h-4 w-4" />
            Connection error
          </span>
        ) : null}
      </div>

      {errored ? (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
          Unable to connect Pollinations. Try again.
        </div>
      ) : null}

      <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
        {connected ? (
          <div className="space-y-2 text-sm text-white/70">
            {status.username ? <p>Account · {status.username}</p> : null}
            {status.pollenBalance != null ? (
              <p>Pollen available · {status.pollenBalance.toFixed(2)}</p>
            ) : (
              <p>Pollen balance unavailable (usage scope may be limited)</p>
            )}
            {status.expiresAt ? (
              <p className="text-xs text-white/45">
                Authorization expires {new Date(status.expiresAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-white/55">
            Not connected. Authorize Mugtee to spend from your Pollinations wallet via secure OAuth.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {connected ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void disconnect()}
              className="min-h-[44px] gap-2"
            >
              <Unplug className="h-4 w-4" />
              Disconnect
            </Button>
          ) : (
            <Button
              asChild
              className="min-h-[44px] gap-2 bg-gold-gradient text-black"
            >
              <a href="/api/auth/pollinations/start?redirect=/settings">
                <Plug className="h-4 w-4" />
                Connect Pollinations
              </a>
            </Button>
          )}
          {!connected ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => void load()}
              className="min-h-[44px]"
            >
              Try again
            </Button>
          ) : null}
        </div>
      </div>

      {status.platformFallbackConfigured ? (
        <p className={cn('mt-3 text-xs text-white/40')}>
          Platform Pollinations fallback is configured for users who have not connected BYOP.
        </p>
      ) : null}
    </section>
  )
}
