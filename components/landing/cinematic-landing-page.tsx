'use client'

import { useCallback, useRef, useState } from 'react'
import { ModeSelectionHero } from '@/components/mugtee-portal/mode-selection-hero'
import { CreatorInspiration } from '@/components/creator-inspiration'
import { saveQuickCutPending } from '@/lib/cinematic/quick-cut/preview-session'

/** Public cinematic landing — ModeSelectionHero + inspiration below hero. */
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

  return (
    <ModeSelectionHero
      ideaTopic={ideaTopic}
      onIdeaTopicChange={setIdeaTopic}
      ideaInputRef={ideaInputRef}
      inspirationSection={
        <CreatorInspiration
          title="See What Mugtee Creates"
          onSelectTopic={handleInspirationSelect}
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 pb-8 sm:pb-10"
        />
      }
    />
  )
}
