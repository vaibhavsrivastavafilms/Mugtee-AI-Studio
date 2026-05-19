'use client'
import { ReactNode, useState } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { StoreProvider } from '@/lib/store'

export default function DashboardShell({ children, user }: { children: ReactNode; user: { email?: string | null; user_metadata?: any } }) {
  const [open, setOpen] = useState(false)
  return (
    <StoreProvider>
      <div className="min-h-screen flex bg-noir-radial">
        <Sidebar mobileOpen={open} onClose={() => setOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar user={user} onMenu={() => setOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </StoreProvider>
  )
}
