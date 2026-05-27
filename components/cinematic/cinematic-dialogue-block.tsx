'use client'

import { isDialogueBlock } from '@/lib/creator/output-presence'
import { cn } from '@/lib/utils'

export function CinematicDialogueBlock({
  text,
  index,
  className,
}: {
  text: string
  index: number
  className?: string
}) {
  const dialogue = isDialogueBlock(text)

  return (
    <div
      className={cn(
        'relative pl-0 sm:pl-1',
        dialogue && 'border-l border-[#D4AF37]/12 pl-4 sm:pl-5 ml-0.5',
        className
      )}
    >
      {dialogue ? (
        <p className="text-[8px] tracking-[0.24em] uppercase text-[#C8A24E]/45 mb-2">
          Dialogue · beat {index + 1}
        </p>
      ) : null}
      <p
        className={cn(
          'text-white/78 whitespace-pre-wrap text-[15px] cinematic-reading-rhythm screenplay-spacing',
          dialogue ? 'text-white/82 italic leading-[2.05]' : 'leading-[1.95]'
        )}
      >
        {text}
      </p>
    </div>
  )
}
