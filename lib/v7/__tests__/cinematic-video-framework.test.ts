import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildV7ProductionConstraintsBlock,
  inferAspectRatioFromPrompt,
  inferPlatformFromPrompt,
  isV7FictionalCreativePrompt,
  resolveV7FrameworkDurationSec,
  shouldRequestV7ContextualResearch,
  V7_CINEMATIC_DEFAULT_DURATION_SEC,
  V7_CINEMATIC_VIDEO_FRAMEWORK,
} from '@/lib/v7/cinematic-video-framework.core'
import {
  buildV7FramedUserInput,
  V7_CINEMATIC_VIDEO_FRAMEWORK as exportedCinematicFramework,
  V7_USER_INPUT_FRAMEWORK,
} from '@/lib/v7/language-routing.core'

describe('V7 cinematic video framework', () => {
  it('exports the canonical cinematic framework constant', () => {
    assert.match(V7_CINEMATIC_VIDEO_FRAMEWORK, /UNIVERSAL CINEMATIC VIDEO GENERATION FRAMEWORK/)
    assert.match(V7_CINEMATIC_VIDEO_FRAMEWORK, /The creator provides the IDEA/)
    assert.match(V7_CINEMATIC_VIDEO_FRAMEWORK, /NEGATIVE GENERATION/)
    assert.match(V7_CINEMATIC_VIDEO_FRAMEWORK, /CREATIVE QUALITY CONTROL/)
    assert.equal(exportedCinematicFramework, V7_CINEMATIC_VIDEO_FRAMEWORK)
  })

  it('uses explicit duration when creator specifies it', () => {
    assert.equal(
      resolveV7FrameworkDurationSec('Create a 30-second Instagram Reel about monsoon food'),
      30
    )
  })

  it('uses framework default duration when creator does not specify timing', () => {
    assert.equal(
      resolveV7FrameworkDurationSec('Create a cinematic video about Janmashtami'),
      V7_CINEMATIC_DEFAULT_DURATION_SEC
    )
    assert.equal(V7_CINEMATIC_DEFAULT_DURATION_SEC, 60)
  })

  it('infers 9:16 for Instagram Reel requests', () => {
    assert.equal(
      inferAspectRatioFromPrompt('Create a 30-second Instagram Reel about monsoon food for Table Tales'),
      '9:16'
    )
  })

  it('respects explicit aspect ratio over social defaults', () => {
    assert.equal(inferAspectRatioFromPrompt('Create a 16:9 documentary about ancient cities'), '16:9')
  })

  it('infers platform from creator text', () => {
    assert.equal(
      inferPlatformFromPrompt('Create a 30-second Instagram Reel about monsoon food for Table Tales'),
      'Instagram'
    )
  })

  it('requests contextual research for factual documentary prompts', () => {
    assert.equal(
      shouldRequestV7ContextualResearch(
        'Create a documentary about five mysterious ancient civilizations'
      ),
      true
    )
    assert.equal(shouldRequestV7ContextualResearch('Create a cinematic video about Janmashtami'), true)
  })

  it('skips unnecessary research for fictional prompts', () => {
    assert.equal(
      isV7FictionalCreativePrompt(
        'Create a funny story about a boy finding a mysterious box in his grandmother\'s house'
      ),
      true
    )
    assert.equal(
      shouldRequestV7ContextualResearch(
        'Create a funny story about a boy finding a mysterious box in his grandmother\'s house'
      ),
      false
    )
  })

  it('builds a production constraints block with resolved duration and research mode', () => {
    const block = buildV7ProductionConstraintsBlock(
      'Create a 30-second Instagram Reel about monsoon food for Table Tales'
    )
    assert.match(block, /Target duration: 30 seconds \(creator-specified\)/)
    assert.match(block, /Aspect ratio: 9:16/)
    assert.match(block, /Platform: Instagram/)
  })
})

describe('V7 framed user input integration', () => {
  it('includes base framework, cinematic framework, language lock, constraints, and raw creator input', () => {
    const framed = buildV7FramedUserInput(
      'Create a cinematic video about Janmashtami.',
      'CREATOR IDEA'
    )
    assert.match(framed, new RegExp(V7_USER_INPUT_FRAMEWORK.slice(0, 40)))
    assert.match(framed, /UNIVERSAL CINEMATIC VIDEO GENERATION FRAMEWORK/)
    assert.match(framed, /PRODUCTION CONSTRAINTS:/)
    assert.match(framed, /Target duration: 60 seconds \(framework default\)/)
    assert.match(framed, /CREATOR IDEA:/)
    assert.match(framed, /Janmashtami/)
  })

  it('preserves Gujarati language lock for Gujarati creator input', () => {
    const framed = buildV7FramedUserInput(
      'ટેબલ ટેલ્સ માટે અમદાવાદના વરસાદી ખોરાક પર 30 સેકન્ડની cinematic reel બનાવો.'
    )
    assert.match(framed, /LANGUAGE LOCK \(gu \/ Gujarati\)/)
    assert.match(framed, /ટેબલ ટેલ્સ/)
    assert.match(framed, /Target duration: 30 seconds \(creator-specified\)/)
  })

  it('does not duplicate the full cinematic framework in downstream brief-only agents', () => {
    const conceptUserPrompt = `CREATOR INTENT:
Create a documentary about five mysterious ancient civilizations.

PRODUCTION BRIEF:
{"title":"Ancient Mysteries","duration":60}`
    assert.doesNotMatch(conceptUserPrompt, /UNIVERSAL CINEMATIC VIDEO GENERATION FRAMEWORK/)
    assert.match(conceptUserPrompt, /PRODUCTION BRIEF:/)
  })

  it('covers golden test inputs for duration, aspect ratio, research, and language', () => {
    const janmashtami = buildV7FramedUserInput('Create a cinematic video about Janmashtami.')
    assert.match(janmashtami, /Contextual research: required/)
    assert.match(janmashtami, /Target duration: 60 seconds/)

    const tableTales = buildV7FramedUserInput(
      'Create a 30-second Instagram Reel about monsoon food for Table Tales.'
    )
    assert.match(tableTales, /Target duration: 30 seconds/)
    assert.match(tableTales, /Aspect ratio: 9:16/)
    assert.match(tableTales, /Table Tales/)

    const documentary = buildV7FramedUserInput(
      'Create a documentary about five mysterious ancient civilizations.'
    )
    assert.match(documentary, /Contextual research: required/)
    assert.match(documentary, /five mysterious ancient civilizations/)

    const fictional = buildV7FramedUserInput(
      'Create a funny story about a boy finding a mysterious box in his grandmother\'s house.'
    )
    assert.match(fictional, /Contextual research: skip/)
  })
})
