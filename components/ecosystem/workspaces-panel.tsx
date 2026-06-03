'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Workspace = { id: string; name: string; ownerId: string }

export function WorkspacesPanel() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [name, setName] = useState('Campaign Team')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/workspaces', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as { workspaces?: Workspace[] }
      setWorkspaces(data.workspaces ?? [])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const create = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Create failed')
      toast.success('Workspace created')
      setName('Campaign Team')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-luxe/55">
        Team workspaces isolate memory and permissions. Invite members via user id (stub).
      </p>
      <div className="flex gap-2 max-w-md">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace name" />
        <Button disabled={busy} onClick={() => void create()}>
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </div>
      <ul className="space-y-2">
        {workspaces.map((w) => (
          <li
            key={w.id}
            className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 bg-white/[0.02]"
          >
            <Users className="h-4 w-4 text-cyan-400/80" />
            <div>
              <p className="text-sm text-luxe">{w.name}</p>
              <p className="text-[10px] text-luxe/40 font-mono">{w.id.slice(0, 8)}…</p>
            </div>
          </li>
        ))}
        {!workspaces.length ? (
          <p className="text-sm text-luxe/45">No team workspaces yet.</p>
        ) : null}
      </ul>
    </div>
  )
}
