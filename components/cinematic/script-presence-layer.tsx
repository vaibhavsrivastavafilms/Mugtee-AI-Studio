'use client'

import { useMemo } from 'react'
import { splitScriptBlocks } from '@/lib/creator/output-presence'
import { CinematicBreathingRhythm } from '@/components/cinematic/cinematic-breathing-rhythm'
import { CinematicNoiseReducer } from '@/components/cinematic/cinematic-noise-reducer'
import { CinematicDialogueBlock } from '@/components/cinematic/cinematic-dialogue-block'
import { DirectorReadingMode } from '@/components/cinematic/director-reading-mode'
import { SceneRhythmBreak } from '@/components/cinematic/scene-rhythm-break'
import { ScriptEmphasisPulse } from '@/components/cinematic/script-emphasis-pulse'

export function ScriptPresenceLayer({ script }: { script: string }) {
  const blocks = useMemo(() => splitScriptBlocks(script), [script])
  const hasContent = script.trim().length > 0

  if (!hasContent) {
    return (
      <DirectorReadingMode>
        <p className="text-white/40 italic text-[15px] leading-[1.9]">
          Your story arrives here as the arc takes form.
        </p>
      </DirectorReadingMode>
    )
  }

  return (
    <CinematicNoiseReducer focused>
      <CinematicBreathingRhythm>
        <DirectorReadingMode>
          <div className="space-y-0 max-w-prose mx-auto">
            {blocks.map((block, i) => (
              <div key={i}>
                {i > 0 ? <SceneRhythmBreak beatIndex={i} /> : null}
                <ScriptEmphasisPulse active={i === 0}>
                  <CinematicDialogueBlock text={block} index={i} />
                </ScriptEmphasisPulse>
              </div>
            ))}
          </div>
        </DirectorReadingMode>
      </CinematicBreathingRhythm>
    </CinematicNoiseReducer>
  )
}
