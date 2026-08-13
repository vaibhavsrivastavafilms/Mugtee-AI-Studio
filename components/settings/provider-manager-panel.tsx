'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type ProviderRow = {
  id: string
  connected: boolean
  authenticated: boolean
  healthy: boolean
  available: boolean
  state: string
  model: string | null
  reason: string | null
  action: string | null
  connectUrl?: string | null
  authType: string
  priority: number
}

type PreflightResponse = {
  ok: boolean
  ready: boolean
  selectedProvider: string | null
  error: string | null
  providerReport: ProviderRow[]
}

export function ProviderManagerPanel() {
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, preflightRes] = await Promise.all([
        fetch('/api/providers'),
        fetch('/api/providers/preflight'),
      ])
      const list = (await listRes.json()) as { providers?: ProviderRow[] }
      const pre = (await preflightRes.json()) as PreflightResponse
      setProviders(list.providers ?? [])
      setPreflight(pre)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    try {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get('openart_connected') === '1' || sp.get('openart_error')) {
        void load()
      }
    } catch {
      // ignore
    }
  }, [load])

  async function connectProvider(id: string) {
    if (id === 'openart') {
      window.location.href = '/api/openart/auth?redirect=/studio/settings'
      return
    }
    if (id === 'pollinations') {
      window.location.href = '/api/auth/pollinations/start?redirect=/settings'
      return
    }

    const apiKey = apiKeys[id]?.trim()
    if (!apiKey) return

    setBusy(id)
    try {
      const res = await fetch(`/api/providers/${id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data = (await res.json()) as { message?: string }
      if (!res.ok) throw new Error(data.message ?? 'Connect failed')
      await load()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Connect failed')
    } finally {
      setBusy(null)
    }
  }

  async function disconnectProvider(id: string) {
    setBusy(id)
    try {
      await fetch(`/api/providers/${id}/disconnect`, { method: 'POST' })
      await load()
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4AF37]/75">
            Provider Manager
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Scene video providers</h2>
          <p className="mt-1 text-sm text-white/50">
            Connect, validate, and monitor the providers Mugtee uses for animation.
          </p>
        </div>
        {preflight ? (
          <div className="text-right">
            <p
              className={cn(
                'text-sm font-medium',
                preflight.ready ? 'text-emerald-300' : 'text-amber-300'
              )}
            >
              {preflight.ready
                ? `Ready · ${preflight.selectedProvider ?? 'provider selected'}`
                : 'No READY provider'}
            </p>
            <p className="text-xs text-white/45">Preflight check</p>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-white/45">Loading provider status…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {providers.map((provider) => (
            <li
              key={provider.id}
              className="rounded-xl border border-white/[0.06] bg-black/20 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">
                    {provider.id}
                    <span className="ml-2 text-xs text-white/40">priority {provider.priority}</span>
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#D4AF37]/70">
                    {provider.state}
                  </p>
                  {provider.model ? (
                    <p className="mt-1 text-xs text-white/45">Model · {provider.model}</p>
                  ) : null}
                  {provider.action ? (
                    <p className="mt-2 text-sm text-white/55">{provider.action}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {provider.connectUrl && !provider.available ? (
                    <Button asChild size="sm" variant="secondary">
                      <a href={provider.connectUrl}>Connect OAuth</a>
                    </Button>
                  ) : null}
                  {provider.connected && provider.authType !== 'endpoint' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === provider.id}
                      onClick={() => void disconnectProvider(provider.id)}
                    >
                      Disconnect
                    </Button>
                  ) : null}
                </div>
              </div>

              {provider.authType === 'api_key' && provider.id !== 'pollinations' && !provider.available ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Input
                    type="password"
                    placeholder="Paste API key"
                    value={apiKeys[provider.id] ?? ''}
                    onChange={(event) =>
                      setApiKeys((current) => ({ ...current, [provider.id]: event.target.value }))
                    }
                    className="max-w-md bg-black/40"
                  />
                  <Button
                    size="sm"
                    disabled={busy === provider.id}
                    onClick={() => void connectProvider(provider.id)}
                  >
                    Save & validate
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
