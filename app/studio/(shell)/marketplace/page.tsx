'use client'

import { MarketplacePanel } from '@/components/ecosystem/marketplace-panel'

export default function StudioMarketplacePage() {
  return (
    <main className="max-w-4xl mx-auto space-y-4">
      <header>
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">Ecosystem</p>
        <h1 className="font-display text-2xl text-luxe">Agent Marketplace</h1>
      </header>
      <MarketplacePanel />
    </main>
  )
}
