'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  detectCreatorLanguage,
  resolveCreatorLanguage,
  type DetectedCreatorLanguage,
} from '@/lib/i18n/detect-creator-language'
import {
  loadCreatorLanguageSession,
  persistCreatorLanguageFromText,
} from '@/lib/i18n/creator-language-session'

/** Detect and persist creator language from companion input. */
export function useCompanionLanguage(initialText = '') {
  const [language, setLanguage] = useState<DetectedCreatorLanguage | null>(() => {
    if (typeof window === 'undefined') return null
    return loadCreatorLanguageSession()
  })

  const detectFromText = useCallback((text: string) => {
    const session = loadCreatorLanguageSession()
    const detected = resolveCreatorLanguage(text, session)
    setLanguage(detected)
    persistCreatorLanguageFromText(text)
    return detected
  }, [])

  useEffect(() => {
    if (initialText.trim()) detectFromText(initialText)
  }, [initialText, detectFromText])

  return {
    language,
    detectFromText,
    detect: detectCreatorLanguage,
  }
}
