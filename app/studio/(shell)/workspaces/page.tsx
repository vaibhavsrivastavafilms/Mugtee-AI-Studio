'use client'

import { WorkspacesPanel } from '@/components/ecosystem/workspaces-panel'

export default function StudioWorkspacesPage() {
  return (
    <main className="max-w-4xl mx-auto space-y-4">
      <header>
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">Ecosystem</p>
        <h1 className="font-display text-2xl text-luxe">Team Workspaces</h1>
      </header>
      <WorkspacesPanel />
    </main>
  )
}
