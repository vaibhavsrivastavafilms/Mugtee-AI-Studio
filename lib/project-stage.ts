// MUGTEE V3.5 — Project stage derivation.
//
// Pure function: given a chronological list of activity events for a project,
// returns the most-advanced stage reached. Order matters — later stages override
// earlier ones so a project that has a voiceover but also an old script_generated
// event is correctly classified as "Voiceover".
//
// Stages map to the user's mental model:
//   Idea       → no activity yet
//   Scripting  → script generated or being edited
//   Narration  → narration extracted
//   Visuals    → image / flow prompts generated
//   Voiceover  → voiceover generated
//   Exporting  → export created
//   Published  → content_pieces.status === 'published' (computed externally)

import type { EventType } from './log-event'

export type ProjectStage =
  | 'idea'
  | 'scripting'
  | 'narration'
  | 'visuals'
  | 'voiceover'
  | 'exporting'
  | 'published'

export const STAGE_META: Record<ProjectStage, { label: string; tone: string; emoji: string }> = {
  idea:       { label: 'Idea',       tone: 'text-amber-300/80',   emoji: '\u2728' },
  scripting:  { label: 'Scripting',  tone: 'text-gold-300',       emoji: '\u270D\uFE0F' },
  narration:  { label: 'Narration',  tone: 'text-rose-300',       emoji: '\uD83C\uDFA4' },
  visuals:    { label: 'Visuals',    tone: 'text-cyan-300',       emoji: '\uD83C\uDFA8' },
  voiceover:  { label: 'Voiceover',  tone: 'text-purple-300',     emoji: '\uD83D\uDD0A' },
  exporting:  { label: 'Exporting',  tone: 'text-emerald-300',    emoji: '\uD83D\uDCE6' },
  published:  { label: 'Published',  tone: 'text-gold-200',       emoji: '\uD83C\uDF1F' },
}

const EVENT_TO_STAGE: Partial<Record<EventType, ProjectStage>> = {
  content_created:        'idea',
  project_opened:         'scripting',
  script_generated:       'scripting',
  rewrite_applied:        'scripting',
  content_updated:        'scripting',
  narration_extracted:    'narration',
  flow_prompts_generated: 'visuals',
  image_generated:        'visuals',
  voiceover_generated:    'voiceover',
  export_created:         'exporting',
  regeneration_used:      'scripting',
}

// Higher number = more advanced stage. Used so we never *regress* the stage
// just because the user clicked Regenerate after a voiceover.
const STAGE_RANK: Record<ProjectStage, number> = {
  idea: 0, scripting: 1, narration: 2, visuals: 3, voiceover: 4, exporting: 5, published: 6,
}

export interface StageEvent {
  event_type?: string | null
  action?: string | null
  target?: string | null
}

export function deriveStage(
  events: StageEvent[],
  opts: { status?: string | null } = {}
): ProjectStage {
  if (opts.status === 'published') return 'published'
  let best: ProjectStage = 'idea'
  for (const ev of events) {
    const mapped = EVENT_TO_STAGE[(ev.event_type || '') as EventType]
    if (mapped && STAGE_RANK[mapped] > STAGE_RANK[best]) best = mapped
    // Legacy: events with no event_type — infer from action verb.
    if (!ev.event_type && ev.action) {
      const a = ev.action.toLowerCase()
      if (/(voiceover|narration\s*voice)/.test(a)) { if (STAGE_RANK.voiceover > STAGE_RANK[best]) best = 'voiceover' }
      else if (/(image|storyboard|b-?roll|visual|prompt)/.test(a)) { if (STAGE_RANK.visuals > STAGE_RANK[best]) best = 'visuals' }
      else if (/(narration)/.test(a))                              { if (STAGE_RANK.narration > STAGE_RANK[best]) best = 'narration' }
      else if (/(export|download|docx)/.test(a))                   { if (STAGE_RANK.exporting > STAGE_RANK[best]) best = 'exporting' }
      else if (/(script|rewrite|edit|generated|created)/.test(a))  { if (STAGE_RANK.scripting > STAGE_RANK[best]) best = 'scripting' }
    }
  }
  return best
}

// A subtle, non-spammy memory line for the dashboard "Continue Creating" row.
// Returns null if there's nothing emotionally relevant to say.
export function memoryLineForStage(stage: ProjectStage, title?: string | null): string | null {
  const t = title ? `\u201C${title}\u201D` : 'this project'
  switch (stage) {
    case 'idea':       return `You started ${t}. Want to draft the script?`
    case 'scripting':  return `You were writing ${t}. Pick up where you left off.`
    case 'narration':  return `Your narration for ${t} is ready to read.`
    case 'visuals':    return `Your visual storyboard for ${t} is ready.`
    case 'voiceover':  return `You stopped during voiceover for ${t}.`
    case 'exporting':  return `${t} is ready to export.`
    case 'published':  return `${t} is live.`
    default:           return null
  }
}
