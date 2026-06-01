'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { applyWorkflowHashFromLocation } from '@/lib/workflow/workflow-navigation'
import { loadWorkflowSession } from '@/lib/workflow/workflow-session'
import {
  restoreWorkflowScroll,
  saveWorkflowScroll,
} from '@/lib/creator/workflow-continuity'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/**
 * Restores workflow location after auth redirects, reloads, and deep links.
 * Mount once inside the studio workspace shell.
 */
export function SessionContinuityGuard({ projectId }: { projectId?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const restoredRef = useRef(false)
  const scrollRestoredRef = useRef(false)

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    applyWorkflowHashFromLocation()

    const session = loadWorkflowSession()
    if (!session) return

    if (projectId && session.projectId && session.projectId !== projectId) return

    const store = useQuickCutGenerationStore.getState()
    if (session.lastVisitedStep) {
      store.setCurrentWorkflowStep(session.lastVisitedStep)
    } else if (session.currentWorkflowStep) {
      store.setCurrentWorkflowStep(session.currentWorkflowStep)
    }
  }, [projectId, pathname, searchParams])

  useEffect(() => {
    if (scrollRestoredRef.current) return
    const step =
      useQuickCutGenerationStore.getState().lastVisitedStep ??
      useQuickCutGenerationStore.getState().currentWorkflowStep
    if (!step) return

    const y = restoreWorkflowScroll(step)
    if (y == null || y <= 0) return

    scrollRestoredRef.current = true
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: 'auto' })
    })
  }, [projectId])

  useEffect(() => {
    const onScroll = () => {
      const step =
        useQuickCutGenerationStore.getState().lastVisitedStep ??
        useQuickCutGenerationStore.getState().currentWorkflowStep
      if (!step) return
      saveWorkflowScroll(step, window.scrollY)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return null
}
