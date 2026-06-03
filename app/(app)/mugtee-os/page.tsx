import { MugteeOsShell } from '@/components/mugtee-os/mugtee-os-shell'

export const dynamic = 'force-dynamic'

export default function MugteeOsPage() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 sm:px-6 py-8">
      <MugteeOsShell />
    </main>
  )
}
