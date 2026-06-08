'use client'

import { useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline, directorBtnPrimary } from '@/lib/studio/director-mode-tokens'
import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { useCreativeTeamStore } from '@/stores/creative-team-store'
import { CREATIVE_TEAM_AGENT_REGISTRY } from '@/lib/creative-team/agents/registry'
import type { AgentState, CreativeTeamAgentId } from '@/lib/creative-team/types'

const AGENT_AVATARS: Record<CreativeTeamAgentId, string> = {
  'story-strategist': '🎯',
  'executive-producer': '🎬',
  screenwriter: '✍️',
  cinematographer: '📷',
  'voice-director': '🎙️',
  'music-director': '🎵',
}

const STATUS_STYLES: Record<AgentState, string> = {
  pending: 'bg-white/[0.06] text-white/45 border-white/10',
  running: 'bg-amber-500/15 text-amber-200 border-amber-500/30 animate-pulse',
  accepted: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  rejected: 'bg-red-500/10 text-red-300/80 border-red-500/20',
  regenerate: 'bg-gold-500/15 text-gold-200 border-gold-500/30',
}

function AlignmentRing({ score, label }: { score: number; label: string }) {
  const pct = Math.min(100, Math.max(0, score))
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gold-500/20 bg-black/50">
      <span className="text-2xl font-semibold tabular-nums text-gold-200">{pct}</span>
      <span className="text-[9px] uppercase tracking-[0.14em] text-white/40 text-center">{label}</span>
    </div>
  )
}

function TeamMemberCard({
  agentId,
  name,
  status,
  preview,
  onAccept,
  onReject,
  onRegenerate,
  disabled,
}: {
  agentId: CreativeTeamAgentId
  name: string
  status: AgentState
  preview: string
  onAccept: () => void
  onReject: () => void
  onRegenerate: () => void
  disabled: boolean
}) {
  return (
    <article className="relative rounded-2xl border border-gold-500/15 bg-gradient-to-br from-black/70 via-black/50 to-gold-950/20 p-4 space-y-3 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" aria-hidden />
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold-500/25 bg-gold-500/[0.08] text-xl">
          {AGENT_AVATARS[agentId]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-gold-100/95">{name}</h3>
            <span
              className={cn(
                'text-[9px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border',
                STATUS_STYLES[status]
              )}
            >
              {status}
            </span>
          </div>
          <p className="mt-2 text-xs text-white/55 leading-relaxed line-clamp-3">
            {preview || 'Awaiting team run…'}
          </p>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={disabled || status === 'pending'}
          className={cn(directorBtnPrimary, 'text-[10px] px-3 py-1.5 disabled:opacity-40')}
          onClick={onAccept}
        >
          Accept
        </button>
        <button
          type="button"
          disabled={disabled || status === 'pending'}
          className={cn(directorBtnOutline, 'text-[10px] px-3 py-1.5 disabled:opacity-40')}
          onClick={onReject}
        >
          Reject
        </button>
        <button
          type="button"
          disabled={disabled || status === 'pending'}
          className="text-[10px] uppercase tracking-wider text-gold-400/70 hover:text-gold-300 disabled:opacity-40"
          onClick={onRegenerate}
        >
          Regenerate
        </button>
      </div>
    </article>
  )
}

export function CreativeTeamPanel() {
  const projectId = useDirectorStudioStore((s) => s.projectId)
  const pkg = useCreativeTeamStore((s) => s.creativeTeamPackage)
  const alignment = useCreativeTeamStore((s) => s.alignmentScore)
  const agentStates = useCreativeTeamStore((s) => s.agentStates)
  const loading = useCreativeTeamStore((s) => s.loading)
  const error = useCreativeTeamStore((s) => s.error)
  const load = useCreativeTeamStore((s) => s.loadCreativeTeam)
  const run = useCreativeTeamStore((s) => s.runCreativeTeam)
  const acceptAgent = useCreativeTeamStore((s) => s.acceptAgent)
  const rejectAgent = useCreativeTeamStore((s) => s.rejectAgent)
  const regenerateAgent = useCreativeTeamStore((s) => s.regenerateAgent)

  useEffect(() => {
    if (projectId) void load(projectId)
  }, [projectId, load])

  const handleRun = useCallback(() => {
    if (projectId) void run(projectId)
  }, [projectId, run])

  const reportPreview = (agentId: CreativeTeamAgentId): string => {
    if (!pkg) return ''
    const map = {
      'story-strategist': pkg.storyStrategy,
      'executive-producer': pkg.producerReport,
      screenwriter: pkg.screenwriterReport,
      cinematographer: pkg.cinematographyReport,
      'voice-director': pkg.voiceReport,
      'music-director': pkg.musicReport,
    }
    return map[agentId]?.preview ?? map[agentId]?.summary ?? ''
  }

  return (
    <DirectorPanelShell
      title="AI Creative Team"
      subtitle="You are the Director. Your six specialists propose — you accept, reject, or regenerate."
      actions={
        <button
          type="button"
          className={directorBtnPrimary}
          disabled={loading || !projectId}
          onClick={handleRun}
        >
          {loading ? 'Team working…' : 'Run creative team'}
        </button>
      }
      className="border-gold-500/25 bg-gradient-to-b from-gold-950/10 to-black/40"
    >
      {error ? <p className="text-xs text-red-400/90">{error}</p> : null}

      {alignment ? (
        <div className="rounded-2xl border border-gold-500/20 bg-black/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold-400/80">
                Creative Alignment Score
              </p>
              <p className="text-3xl font-semibold text-gold-100 tabular-nums mt-1">
                {alignment.overall}
                <span className="text-sm text-white/40 font-normal ml-1">/ 100</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <AlignmentRing score={alignment.story} label="Story" />
            <AlignmentRing score={alignment.visuals} label="Visuals" />
            <AlignmentRing score={alignment.voice} label="Voice" />
            <AlignmentRing score={alignment.music} label="Music" />
            <AlignmentRing score={alignment.audienceFit} label="Audience" />
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/45 italic">
          Run the team after treatment to receive aligned recommendations before blueprint.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {CREATIVE_TEAM_AGENT_REGISTRY.map((agent) => (
          <TeamMemberCard
            key={agent.id}
            agentId={agent.id}
            name={agent.name}
            status={agentStates[agent.id] ?? 'pending'}
            preview={reportPreview(agent.id)}
            disabled={loading || !pkg}
            onAccept={() => void acceptAgent(agent.id)}
            onReject={() => void rejectAgent(agent.id)}
            onRegenerate={() => void regenerateAgent(agent.id)}
          />
        ))}
      </div>

      <p className="text-[10px] text-white/35 leading-relaxed border-t border-white/[0.06] pt-3">
        Producer Review (later stage) shows the executive producer deep dive — same report synced
        from this roster. No duplicate analysis run required.
      </p>
    </DirectorPanelShell>
  )
}
