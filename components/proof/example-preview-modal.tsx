'use client'

import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProofShowcaseExample } from '@/lib/proof/showcase-examples'
import { proofNicheLabel } from '@/lib/proof/showcase-examples'
import { FileText, Film, Hash, ImageIcon, Zap } from 'lucide-react'

type ExamplePreviewModalProps = {
  example: ProofShowcaseExample | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function PreviewBlock({
  icon: Icon,
  label,
  body,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  body: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/40 p-4',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-[var(--v2-gold,#d4af37)]/85 mb-2">
        <Icon className="w-3 h-3" aria-hidden />
        {label}
      </div>
      <pre className="whitespace-pre-wrap break-words text-[12.5px] leading-[1.7] text-[var(--v2-text-primary,#F4E7C1)]/90 font-sans">
        {body}
      </pre>
    </div>
  )
}

export function ExamplePreviewModal({
  example,
  open,
  onOpenChange,
}: ExamplePreviewModalProps) {
  if (!example) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-2xl max-h-[90dvh] overflow-y-auto scrollbar-luxe',
          'border-[var(--v2-border,rgba(255,255,255,0.08))] bg-[var(--v2-bg,#0a0a0a)]',
          'text-[var(--v2-text-primary,#F4E7C1)] p-5 sm:p-7'
        )}
      >
        <DialogHeader className="text-left space-y-3">
          <Badge
            variant="outline"
            className={cn(
              'w-fit border-[var(--v2-gold,#d4af37)]/30 bg-[var(--v2-gold,#d4af37)]/10',
              'text-[9px] tracking-[0.2em] uppercase text-[var(--v2-gold,#d4af37)]'
            )}
          >
            {proofNicheLabel(example.niche)}
          </Badge>
          <DialogTitle className="font-display text-xl sm:text-2xl text-[var(--v2-text-primary,#F4E7C1)] leading-snug">
            {example.topic}
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--v2-text-secondary,rgba(244,231,193,0.6))] italic">
            Curated example — static preview, no login required.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <PreviewBlock icon={Zap} label="Full Hook" body={example.fullHook} />

          <PreviewBlock icon={FileText} label="Full Script" body={example.fullScript} />

          <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
            <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-[var(--v2-gold,#d4af37)]/85 mb-3">
              <Film className="w-3 h-3" aria-hidden />
              Storyboard Preview
            </div>
            <div className="grid grid-cols-3 gap-2">
              {example.storyboardPreview.map((src, i) => (
                <div
                  key={`${example.id}-frame-${i}`}
                  className="relative aspect-[9/16] rounded-lg overflow-hidden border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-black/60"
                >
                  <Image
                    src={src}
                    alt={`${example.topic} storyboard frame ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="120px"
                    unoptimized
                  />
                  <span className="absolute bottom-1.5 left-1.5 text-[8px] tracking-wider uppercase text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
                    Frame {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <PreviewBlock icon={Hash} label="Caption" body={example.caption} />

          <PreviewBlock
            icon={ImageIcon}
            label="Thumbnail Concept"
            body={example.thumbnailConcept}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

