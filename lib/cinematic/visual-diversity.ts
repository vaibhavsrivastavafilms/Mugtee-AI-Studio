/** Camera/framing rotation to reduce repetitive gold-portal / silhouette frames. */

const CAMERA_ROTATIONS = [
  'Medium close-up, subject off-center rule of thirds',
  'Wide establishing shot, environmental context dominant',
  'Over-the-shoulder depth, foreground blur',
  'Low angle hero framing, grounded perspective',
  'High angle observational, spatial scale',
  'Profile silhouette against practical light source',
  'Dutch angle tension, asymmetric composition',
  'Extreme close-up on hands or object detail',
] as const

const ENVIRONMENT_SHIFTS = [
  'Interior practical lighting, lived-in texture',
  'Exterior natural light, open sky negative space',
  'Urban street level, ambient neon or signage',
  'Domestic intimate space, warm tungsten',
  'Industrial minimal, concrete and shadow',
  'Nature macro detail, organic foreground',
] as const

const ANTI_REPETITION = [
  'Avoid generic gold portal, luxury silhouette, or stock cinematic clichés.',
  'No repeated doorway-of-light motif unless explicitly in the scene text.',
  'Distinct composition from prior frames — different camera height and subject placement.',
] as const

export function diversityIndexForScene(sceneIndex: number, attempt = 0): number {
  return (sceneIndex + attempt * 3) % CAMERA_ROTATIONS.length
}

export function cameraVariationDirective(sceneIndex: number, attempt = 0): string {
  const idx = diversityIndexForScene(sceneIndex, attempt)
  const envIdx = (sceneIndex + attempt) % ENVIRONMENT_SHIFTS.length
  return [
    `Camera variation: ${CAMERA_ROTATIONS[idx]}.`,
    `Environment shift: ${ENVIRONMENT_SHIFTS[envIdx]}.`,
    ANTI_REPETITION[attempt % ANTI_REPETITION.length],
  ].join(' ')
}

export function variationCompositionDirective(sceneIndex: number, attempt = 0): string {
  return [
    'Alternate composition — same character, palette, and emotional tone.',
    cameraVariationDirective(sceneIndex, attempt + 1),
  ].join(' ')
}
