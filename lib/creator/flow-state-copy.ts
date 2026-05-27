export type FlowContext =
  | 'session'
  | 'reading'
  | 'refining'
  | 'storyboard'
  | 'export'

const FOCUS_LINES = [
  'Maintaining your current emotional rhythm.',
  'Preserving focus on active cinematic sequence.',
  'Your directing flow remains uninterrupted.',
  'Creative momentum preserved.',
] as const

const ATTENTION_LINES = [
  'Directing attention held on current beat.',
  'Visual orientation maintained.',
  'Emotional focus preserved.',
] as const

const FLOW_RHYTHM_LINES = [
  'Screenplay rhythm flowing.',
  'Emotional pacing continuous.',
  'Cinematic cadence maintained.',
] as const

const REFINE_FLOW_LINES = [
  'Only the selected cinematic beat is evolving.',
  'Your emotional progression remains uninterrupted.',
  'Preserving current visual tension.',
] as const

const SELECTIVE_EVOLUTION_LINES = [
  'Selected beat evolving · arc intact',
  'One moment reshaping · flow preserved',
  'Targeted refinement · rhythm held',
] as const

const EXPORT_CLOSURE_LINES = [
  'Your cinematic sequence has reached final form.',
  'Emotional rhythm preserved through export.',
  'Visual continuity finalized for delivery.',
] as const

export function getFocusAnchorLine(seed = 0): string {
  return FOCUS_LINES[seed % FOCUS_LINES.length]
}

export function getAttentionGuideLine(seed = 0): string {
  return ATTENTION_LINES[seed % ATTENTION_LINES.length]
}

export function getFlowRhythmLine(context: FlowContext, seed = 0): string {
  if (context === 'refining') {
    return REFINE_FLOW_LINES[seed % REFINE_FLOW_LINES.length]
  }
  if (context === 'export') {
    return EXPORT_CLOSURE_LINES[seed % EXPORT_CLOSURE_LINES.length]
  }
  const pool = [...FLOW_RHYTHM_LINES, FOCUS_LINES[seed % FOCUS_LINES.length]]
  return pool[seed % pool.length]
}

export function getRefinementFlowLine(seed = 0): string {
  return REFINE_FLOW_LINES[seed % REFINE_FLOW_LINES.length]
}

export function getSelectiveEvolutionMarker(seed = 0): string {
  return SELECTIVE_EVOLUTION_LINES[seed % SELECTIVE_EVOLUTION_LINES.length]
}

export function getEmotionalRhythmProtection(seed = 0): string {
  return REFINE_FLOW_LINES[(seed + 1) % REFINE_FLOW_LINES.length]
}

export function getExportClosureLine(seed = 0): string {
  return EXPORT_CLOSURE_LINES[seed % EXPORT_CLOSURE_LINES.length]
}

export function getEmotionalFlowMarker(
  stage: string,
  seed = 0
): string {
  const stageMarkers: Record<string, string[]> = {
    preview: ['Reading flow · screenplay immersion', 'Draft rhythm active'],
    director: ['Directing flow · mood locked', 'Creative session in progress'],
    scenes: ['Storyboard flow · visual sequence', 'Scene rhythm active'],
    voiceover: ['Voice flow · narration rhythm', 'Audio cadence aligned'],
    compile: ['Export flow · final form approaching', 'Closure rhythm active'],
    generating: ['Creation flow · story forming', 'Generative rhythm held'],
    create: ['Session opening · premise forming', 'Flow state initializing'],
  }
  const pool = stageMarkers[stage] ?? ['Creative flow active']
  return pool[seed % pool.length]
}

export function getPacingFlowStripLine(seed = 0): string {
  const pool = [
    'Pacing flow continuous',
    'Rhythm uninterrupted',
    'Emotional cadence held',
  ]
  return pool[seed % pool.length]
}

export function getScreenplayRhythmAnchor(seed = 0): string {
  const pool = [
    'Screenplay rhythm anchor · voiceover-ready',
    'Reading flow · directed pacing',
    'Script cadence · emotionally composed',
  ]
  return pool[seed % pool.length]
}
