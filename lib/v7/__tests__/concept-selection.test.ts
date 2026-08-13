import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  applySelectedConceptToBrief,
  isAwaitingConceptSelection,
  mergeConceptSelectionTimeline,
  validateConceptIndex,
} from '@/lib/v7/concept-selection.core'
import type { V7Concept, V7CreativeBrief } from '@/types/v7/production'

const sampleBrief: V7CreativeBrief = {
  title: 'Table Tales',
  duration: 45,
  platform: 'Instagram',
  language: 'English',
  aspectRatio: '9:16',
  genre: 'advertisement',
  style: 'cinematic',
  sceneCount: 4,
  voiceDirection: 'warm narrator',
  musicDirection: 'soft monsoon ambience',
  emotion: 'nostalgic',
  audience: 'food lovers',
  characterConsistency: true,
}

const concepts: V7Concept[] = [
  {
    id: 'concept-1',
    title: 'Monsoon Memory',
    hook: 'Some meals only taste right in the rain.',
    coreAngle: 'Emotional nostalgia',
    storyApproach: 'Personal memory arc',
    format: '45s vertical ad',
    estimatedDuration: 45,
    tone: 'warm',
    whyItCouldWork: 'Emotion-first food storytelling performs on Reels.',
  },
  {
    id: 'concept-2',
    title: 'Steam and Spice',
    hook: 'Watch monsoon transform every dish.',
    coreAngle: 'Cinematic food transformation',
    storyApproach: 'Macro food progression',
    format: '45s vertical ad',
    estimatedDuration: 45,
    tone: 'luxurious',
    whyItCouldWork: 'Visual appetite appeal drives shares.',
  },
  {
    id: 'concept-3',
    title: 'The Restaurant Speaks',
    hook: 'Table Tales has weather in its kitchen.',
    coreAngle: 'Restaurant as character',
    storyApproach: 'Personified dining room',
    format: '45s vertical ad',
    estimatedDuration: 45,
    tone: 'playful',
    whyItCouldWork: 'Character-led ads feel distinct in feed.',
  },
  {
    id: 'concept-4',
    title: 'Craving in the Rain',
    hook: 'Fast cuts. Faster hunger.',
    coreAngle: 'Fast-paced craving story',
    storyApproach: 'Beat-driven montage',
    format: '45s vertical ad',
    estimatedDuration: 45,
    tone: 'energetic',
    whyItCouldWork: 'Punchy pacing fits short-form ads.',
  },
]

describe('concept selection core', () => {
  it('marks awaiting state when concepts are present and none selected', () => {
    const timeline = mergeConceptSelectionTimeline(null, {
      awaiting: true,
      concepts,
      selectedIndex: null,
      selectedAt: null,
    })
    assert.equal(isAwaitingConceptSelection(timeline), true)
  })

  it('validates concept index bounds', () => {
    assert.equal(validateConceptIndex(concepts, 0)?.id, 'concept-1')
    assert.equal(validateConceptIndex(concepts, 3)?.title, 'Craving in the Rain')
    assert.equal(validateConceptIndex(concepts, 4), null)
    assert.equal(validateConceptIndex(concepts, -1), null)
  })

  it('merges selected concept into brief for downstream stages', () => {
    const selected = validateConceptIndex(concepts, 1)
    assert.ok(selected)
    const merged = applySelectedConceptToBrief(sampleBrief, selected)
    assert.equal(merged.title, 'Steam and Spice')
    assert.equal(merged.selectedConcept?.id, 'concept-2')
    assert.match(merged.style, /Cinematic food transformation/)
  })

  it('clears awaiting after selection metadata is written', () => {
    const timeline = mergeConceptSelectionTimeline(null, {
      awaiting: false,
      concepts,
      selectedIndex: 2,
      selectedAt: new Date().toISOString(),
    })
    assert.equal(isAwaitingConceptSelection(timeline), false)
  })
})
