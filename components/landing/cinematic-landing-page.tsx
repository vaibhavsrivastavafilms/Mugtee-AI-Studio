'use client'

import { useCallback, useRef, useState } from 'react'
import { ModeSelectionHero } from '@/components/mugtee-portal/mode-selection-hero'
import { CreatorInspiration } from '@/components/creator-inspiration'
import { CinematicDemo } from '@/components/landing/cinematic-demo'
import { CreatorProof } from '@/components/landing/creator-proof'
import { PipelineFeatures } from '@/components/landing/pipeline-features'
import { saveQuickCutPending } from '@/lib/cinematic/quick-cut/preview-session'

/** Public cinematic landing — ModeSelectionHero + Phase 2 sections below hero. */
export default function CinematicLandingPage() {
  const [ideaTopic, setIdeaTopic] = useState('')
  const ideaInputRef = useRef<HTMLTextAreaElement>(null)

  const handleInspirationSelect = useCallback((topic: string) => {
    setIdeaTopic(topic)
    saveQuickCutPending({
      prompt: topic,
      style: '',
      duration: 60,
    })
    requestAnimationFrame(() => {
      ideaInputRef.current?.focus()
      ideaInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [])

  const belowHero = (
    <>
      <CreatorInspiration
        title="See What Mugtee Creates"
        onSelectTopic={handleInspirationSelect}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 pb-4 sm:pb-6"
      />
      <CinematicDemo className="max-w-5xl mx-auto" />
      <CreatorProof className="max-w-5xl mx-auto pb-6" />
      <PipelineFeatures className="max-w-5xl mx-auto" />
    </>
  )

  return (
    <ModeSelectionHero
      ideaTopic={ideaTopic}
      onIdeaTopicChange={setIdeaTopic}
      ideaInputRef={ideaInputRef}
      inspirationSection={belowHero}
    />
  )
}
