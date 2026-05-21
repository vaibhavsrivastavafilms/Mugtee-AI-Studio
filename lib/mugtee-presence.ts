// MUGTEE Presence — lightweight pub/sub for global voice state.
// Used by AudioSpectrumLogo to react cinematic-ally when any component starts
// listening or speaking via useSpeechRecognition / useSpeechSynthesis.
//
// Zero new deps. Snapshot pattern is React-18 useSyncExternalStore-friendly.

export type MugteePresenceState = {
  listening: boolean
  speaking: boolean
  intentLabel?: string | null   // optional micro-label, e.g. "Listening…" / "Sharpening hook…"
}

let state: MugteePresenceState = { listening: false, speaking: false, intentLabel: null }
const listeners = new Set<() => void>()

export const mugteePresence = {
  get(): MugteePresenceState { return state },
  set(patch: Partial<MugteePresenceState>) {
    // Avoid re-renders when nothing actually changed.
    const next = { ...state, ...patch }
    if (next.listening === state.listening && next.speaking === state.speaking && next.intentLabel === state.intentLabel) return
    state = next
    listeners.forEach(l => { try { l() } catch {} })
  },
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
}
