import { EcosystemObservability } from '@/components/admin/ecosystem-observability'

export const dynamic = 'force-dynamic'

export default function AdminEcosystemPage() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">Admin</p>
        <h1 className="font-display text-2xl text-luxe">Ecosystem Platform</h1>
        <p className="text-sm text-luxe/55 mt-1">
          Agent usage, integration health, failures, and cost hints.
        </p>
      </header>
      <EcosystemObservability />
    </main>
  )
}
