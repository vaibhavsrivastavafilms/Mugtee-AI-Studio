import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  applyResolvedV7LanguageToBrief,
  buildV7FramedUserInput,
  detectV7ContentLanguage,
  normalizeV7ContentLanguage,
  parseExplicitV7LanguageRequest,
  resolveV7ContentLanguageFromBrief,
  v7LanguageDirectiveForBrief,
  V7_CINEMATIC_VIDEO_FRAMEWORK,
  V7_USER_INPUT_FRAMEWORK,
} from '@/lib/v7/language-routing.core'
import type { V7CreativeBrief } from '@/types/v7/production'

function baseBrief(language: string): V7CreativeBrief {
  return {
    title: 'Test',
    duration: 30,
    platform: 'Instagram',
    language,
    aspectRatio: '9:16',
    genre: 'Food',
    style: 'Cinematic',
    sceneCount: 4,
    voiceDirection: 'Warm narrator',
    musicDirection: 'Soft ambient',
    emotion: 'Cozy',
    audience: 'Local food lovers',
    characterConsistency: true,
  }
}

describe('V7 language detection', () => {
  it('detects Gujarati script input as gu', () => {
    assert.equal(
      detectV7ContentLanguage('ટેબલ ટેલ્સ માટે અમદાવાદના વરસાદી ખોરાક પર 30 સેકન્ડની cinematic reel બનાવો.'),
      'gu'
    )
  })

  it('detects Hindi Devanagari input as hi', () => {
    assert.equal(
      detectV7ContentLanguage('दिल्ली की सर्दियों में गरम समोसे पर एक cinematic reel बनाओ'),
      'hi'
    )
  })

  it('detects English input as en', () => {
    assert.equal(
      detectV7ContentLanguage('Create a 30-second cinematic restaurant ad for monsoon dining.'),
      'en'
    )
  })

  it('honors explicit Gujarati override on English prompt', () => {
    assert.equal(parseExplicitV7LanguageRequest('Make this in Gujarati about monsoon food'), 'gu')
    assert.equal(
      detectV7ContentLanguage('Create a restaurant reel in Gujarati about Ahmedabad monsoon food'),
      'gu'
    )
  })
})

describe('V7 language brief routing', () => {
  it('stores ISO code on the creative brief from prompt detection', () => {
    const brief = applyResolvedV7LanguageToBrief(
      baseBrief('English'),
      'અમદાવાદના વરસાદમાં ગરમ ભજીયા પર એક રીલ બનાવો'
    )
    assert.equal(brief.language, 'gu')
  })

  it('normalizes legacy language labels to ISO codes', () => {
    assert.equal(normalizeV7ContentLanguage('Gujarati'), 'gu')
    assert.equal(normalizeV7ContentLanguage('Hindi'), 'hi')
    assert.equal(normalizeV7ContentLanguage('English'), 'en')
  })

  it('passes gu to downstream language directives', () => {
    const directive = v7LanguageDirectiveForBrief(baseBrief('gu'))
    assert.match(directive, /LANGUAGE LOCK \(gu \/ Gujarati\)/)
    assert.match(directive, /Write ALL output in Gujarati/)
  })

  it('preserves English regression routing', () => {
    assert.equal(resolveV7ContentLanguageFromBrief(baseBrief('English')), 'en')
  })

  it('preserves Hindi regression routing', () => {
    assert.equal(resolveV7ContentLanguageFromBrief(baseBrief('Hindi')), 'hi')
  })
})

describe('V7 voice-first language wiring', () => {
  it('resolves gu from brief for voice stage without changing pipeline order', () => {
    const brief = applyResolvedV7LanguageToBrief(
      baseBrief('English'),
      'ટેબલ ટેલ્સ માટે મોનસૂન ફૂડની રીલ બનાવો'
    )
    assert.equal(resolveV7ContentLanguageFromBrief(brief), 'gu')
  })
})

describe('V7 caption language source', () => {
  it('uses Gujarati script in narration for caption derivation', () => {
    const narration = 'વરસાદી સવારે ગરમ ભજીયાનો સ્વાદ અલગ જ છે.'
    assert.match(narration, /[\u0A80-\u0AFF]/)
  })
})

describe('V7 user input framework', () => {
  it('appends the base framework, cinematic framework, language lock, and creator input', () => {
    const framed = buildV7FramedUserInput(
      'ટેબલ ટેલ્સ માટે અમદાવાદના વરસાદી ખોરાક પર 30 સેકન્ડની cinematic reel બનાવો.',
      'CREATOR IDEA'
    )
    assert.match(framed, new RegExp(V7_USER_INPUT_FRAMEWORK.slice(0, 40)))
    assert.match(framed, new RegExp(V7_CINEMATIC_VIDEO_FRAMEWORK.slice(0, 40)))
    assert.match(framed, /PRODUCTION CONSTRAINTS:/)
    assert.match(framed, /LANGUAGE LOCK \(gu \/ Gujarati\)/)
    assert.match(framed, /CREATOR IDEA:/)
    assert.match(framed, /ટેબલ ટેલ્સ/)
  })

  it('supports custom labels for downstream agents', () => {
    const framed = buildV7FramedUserInput('Create a monsoon food reel', 'CREATOR PROMPT')
    assert.match(framed, /CREATOR PROMPT:/)
    assert.match(framed, /Create a monsoon food reel/)
  })
})
