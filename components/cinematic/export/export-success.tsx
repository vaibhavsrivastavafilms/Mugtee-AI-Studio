'use client'

import { Check, Copy, Download, Share2 } from 'lucide-react'
import { getExportIdentityLine } from '@/lib/creator/creator-identity'
import { getExportPacingReassurance } from '@/lib/creator/pacing-intelligence'
import { getExportContinuityLine } from '@/lib/creator/workflow-presence-copy'
import { CinematicExportClosure } from '@/components/cinematic/cinematic-export-closure'
import { EmotionalPresenceFade } from '@/components/cinematic/emotional-presence-fade'
import { CreatorStylePresence } from '@/components/cinematic/creator-style-presence'
import { CreatorAchievementLine } from '@/components/cinematic/export/creator-achievement-line'

export function ExportSuccessPanel({
  onDownload,
  onCopyCaptions,
  onShare,
  onStartNew,
  style,
  niche,
}: {
  onDownload: () => void
  onCopyCaptions: () => void
  onShare: () => void
  onStartNew: () => void
  style?: string | null
  niche?: string | null
}) {
  const identityLine = getExportIdentityLine(style, niche, 1)
  const pacingLine = getExportPacingReassurance(style, niche, 2)

  return (
    <CinematicExportClosure style={style} niche={niche} seed={1}>
      <EmotionalPresenceFade>
        <CreatorStylePresence style={style} niche={niche} className="mb-4" />

        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center cinematic-stage-transition">
          <Check className="w-8 h-8 text-[#E7C56A]" />
        </div>

        <CreatorAchievementLine seed={1} />

        <h2 className="font-display text-2xl sm:text-3xl text-[#F4E7C1] italic leading-snug mb-2">
          Your cinematic story is ready.
        </h2>
        <p className="text-sm text-white/50 max-w-md mx-auto mb-2">
          Your film world is ready — hook, captions, storyboard frames, and voice held in vertical rhythm.
        </p>
        <p className="text-[9px] tracking-[0.2em] uppercase text-white/32 mb-2">
          {pacingLine}
        </p>
        <p className="text-[9px] tracking-[0.2em] uppercase text-white/32 mb-8">
          {identityLine} · {getExportContinuityLine(2)}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <ActionButton icon={Download} label="Save Film World" primary onClick={onDownload} />
          <ActionButton icon={Copy} label="Copy Caption Package" onClick={onCopyCaptions} />
          <ActionButton icon={Share2} label="Share Preview" onClick={onShare} />
        </div>

        <button
          type="button"
          onClick={onStartNew}
          className="mt-8 text-[10px] tracking-[0.22em] uppercase text-white/45 hover:text-[#C8A24E] transition calm-opacity-transition"
        >
          Start a new cinematic story
        </button>
      </EmotionalPresenceFade>
    </CinematicExportClosure>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: typeof Download
  label: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? 'inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#D4AF37] text-black text-sm font-medium hover:bg-[#E7C56A] transition shadow-[0_0_24px_rgba(212,175,55,0.2)] min-h-[44px]'
          : 'inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-white/10 text-white/75 text-sm hover:border-[#D4AF37]/30 hover:text-[#F4E7C1] transition min-h-[44px]'
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}
