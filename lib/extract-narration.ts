// MUGTEE V3.3 — Narration Extractor.
//
// Strips a cinematic / screenplay-formatted script down to ONLY the spoken narration
// lines so the user can preview, copy, or send the narration to ElevenLabs / browser TTS
// without scene labels, parenthetical directions, or visual descriptions leaking in.
//
// Heuristic, dependency-free, ~70 lines. Works against the standard Mugtee script
// shape produced by /api/ai/generate (reel_script mode):
//   [SCENE HEADER]            ← stripped
//   Scene description: ...    ← stripped
//   Narration:                ← label stripped, value kept
//   "actual line"             ← kept (quotes preserved or stripped, see opts)
//   (parenthetical direction) ← stripped
//   # markdown heading        ← stripped
//   --- horizontal rule       ← stripped
//
// Falls back gracefully: if no narration markers are detected, returns the
// original text (better to overshare than to return empty).

export type NarrationOptions = {
  /** Keep surrounding double-quotes around narration lines. Default: false. */
  keepQuotes?: boolean
  /** Collapse double+ blank lines into single blank lines. Default: true. */
  tidyWhitespace?: boolean
}

const SCENE_HEADER_RX        = /^\s*\[[^\]]+\]\s*$/                          // [HOOK], [SCENE 2], etc.
const SCENE_DESC_LABEL_RX    = /^\s*scene\s*description\s*[:\-]/i
const NARRATION_LABEL_RX     = /^\s*narration\s*[:\-]?\s*$/i                  // standalone "Narration:" line
const PARENTHETICAL_ONLY_RX  = /^\s*\([^)]*\)\s*$/                           // (cut to wide shot) on its own line
const HORIZONTAL_RULE_RX     = /^\s*[-=*_]{3,}\s*$/
const MD_HEADING_RX          = /^\s*#{1,6}\s+/                                // # H1, ## H2, etc.
const DIRECTION_TAG_RX       = /\s*\[(?:cut to|fade|beat|pause|sfx|cue)[^\]]*\]\s*/gi
const QUOTE_WRAP_RX          = /^"\s*([\s\S]*?)\s*"$/

export function extractNarration(scriptText: string, opts: NarrationOptions = {}): string {
  const { keepQuotes = false, tidyWhitespace = true } = opts
  if (!scriptText || typeof scriptText !== 'string') return ''

  const out: string[] = []
  const lines = scriptText.replace(/\r\n/g, '\n').split('\n')
  let foundAnyNarrationMarker = false

  for (let raw of lines) {
    let line = raw
    // Skip structural / label lines outright.
    if (SCENE_HEADER_RX.test(line))     { foundAnyNarrationMarker = true; out.push(''); continue }
    if (SCENE_DESC_LABEL_RX.test(line)) { foundAnyNarrationMarker = true; continue }
    if (NARRATION_LABEL_RX.test(line))  { foundAnyNarrationMarker = true; continue }
    if (PARENTHETICAL_ONLY_RX.test(line)) continue
    if (HORIZONTAL_RULE_RX.test(line))  continue
    if (MD_HEADING_RX.test(line))       { line = line.replace(MD_HEADING_RX, '') }

    // Inline strip — remove embedded direction tags like [cut to street].
    line = line.replace(DIRECTION_TAG_RX, ' ')

    // If the line is wrapped in quotes (a typical Mugtee narration line), optionally unwrap.
    const m = QUOTE_WRAP_RX.exec(line.trim())
    if (m) {
      line = keepQuotes ? `"${m[1]}"` : m[1]
      foundAnyNarrationMarker = true
    }

    // Squash trailing/leading whitespace.
    line = line.replace(/[ \t]+$/, '').replace(/^[ \t]+/, '')
    out.push(line)
  }

  // Defensive: if we never saw a structural marker, the input probably wasn't a screenplay-shaped
  // script — return the original tidied text rather than risk stripping too much.
  let result = foundAnyNarrationMarker ? out.join('\n') : scriptText

  if (tidyWhitespace) {
    result = result.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
  }
  return result
}
