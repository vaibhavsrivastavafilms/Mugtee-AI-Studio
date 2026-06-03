'use client'

import { IntegrationsPanel } from '@/components/ecosystem/integrations-panel'

export default function StudioIntegrationsPage() {
  return (
    <main className="max-w-4xl mx-auto space-y-4">
      <header>
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">Ecosystem</p>
        <h1 className="font-display text-2xl text-luxe">Integrations</h1>
      </header>
      <IntegrationsPanel />
    </main>
  )
}
