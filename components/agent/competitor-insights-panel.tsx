'use client'

import { useEffect, useState } from 'react'
import { Users, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreatorAgentStore } from '@/stores/creator-agent-store'

export function CompetitorInsightsPanel({ className }: { className?: string }) {
  const competitors = useCreatorAgentStore((s) => s.competitors)
  const insights = useCreatorAgentStore((s) => s.competitorInsights)
  const fetchCompetitors = useCreatorAgentStore((s) => s.fetchCompetitors)
  const addCompetitor = useCreatorAgentStore((s) => s.addCompetitor)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    void fetchCompetitors()
  }, [fetchCompetitors])

  const handleAdd = async () => {
    if (!name.trim()) return
    setAdding(true)
    await addCompetitor({ name: name.trim() })
    setName('')
    setAdding(false)
  }

  return (
    <div className={cn('rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4', className)}>
      <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/70 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        Competitor insights
        <span className="text-luxe/35 normal-case tracking-normal">(template-based)</span>
      </p>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Channel name…"
          className="flex-1 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-xs text-luxe/80 placeholder:text-luxe/30"
        />
        <button
          type="button"
          disabled={adding || !name.trim()}
          onClick={() => void handleAdd()}
          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-gold-500/15 border border-gold-500/25 text-[10px] text-gold-200 disabled:opacity-40"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {insights.length ? (
        <ul className="space-y-3">
          {insights.map((ins) => (
            <li key={ins.competitorId} className="rounded-lg border border-white/[0.05] p-3">
              <p className="text-xs font-medium text-luxe/80">{ins.name}</p>
              <p className="text-[10px] text-luxe/45 mt-1">{ins.note}</p>
              {ins.opportunities[0] ? (
                <p className="text-[11px] text-gold-300/70 mt-2">Gap: {ins.opportunities[0]}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-luxe/40 italic">
          Add competitor channels manually — no live scraping in MVP.
        </p>
      )}

      {competitors.length > 0 ? (
        <p className="text-[10px] text-luxe/35">{competitors.length} competitor(s) tracked</p>
      ) : null}
    </div>
  )
}
