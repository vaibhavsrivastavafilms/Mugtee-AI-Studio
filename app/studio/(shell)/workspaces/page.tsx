'use client'

import { WorkspacesPanel } from '@/components/ecosystem/workspaces-panel'

export default function StudioWorkspacesPage() {
  return (
    <main className="max-w-4xl mx-auto space-y-4">
      <header>
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">Creative Worlds</p>
        <h1 className="font-display text-2xl text-luxe">The worlds you and Mugtee are building</h1>
        <p className="mt-2 text-sm text-luxe/55">
          Table Tales, weddings, restaurants, client campaigns, and the places where your stories keep growing.
        </p>
      </header>
      <WorkspacesPanel />
    </main>
  )
}
