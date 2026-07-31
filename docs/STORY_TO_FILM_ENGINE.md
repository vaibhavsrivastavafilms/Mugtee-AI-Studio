# Mugtee Story-to-Film Automation Engine

One idea → complete animated cinematic movie. The creator never writes prompts, splits scenes, or stitches clips.

## Creator experience

1. Understanding your idea...
2. Writing your story...
3. Designing characters...
4. Building your world...
5. Creating storyboard...
6. Animating scenes...
7. Recording voices...
8. Composing soundtrack...
9. Editing your movie...
10. Rendering final film...
11. Your movie is ready.

## Agents (1–13)

| # | Agent | Output |
|---|-------|--------|
| 1 | Idea Analyzer | Creative Brief |
| 2 | Story Engine | Original Hindi dialogue-driven story (8–10s scenes) |
| 3 | Screenplay Engine | Production screenplay |
| 4 | Character Director | MAIN characters only — Pixar-style 3D turnaround + expressions |
| 5 | Environment Director | Environment Bible (architecture, lighting, weather, time of day) |
| 6 | Storyboard Engine | Storyboard panels |
| 7 | Prompt Engine | Internal cinematic prompts (batch of 10 when needed) |
| 8 | Image Engine | Storyboard images (Production OS) |
| 9 | Video Engine | Per-scene cinematic clips (Production OS) |
| 10 | Audio Engine | Voice, music, ambient, SFX |
| 11 | Editor | Timeline assembly |
| 12 | Quality Engine | Verify + regenerate only failed scenes |
| 13 | Export Engine | MP4/MOV + Creator Pack |

## Module

`lib/mugtee-agents/`

```ts
import { runMugteeAgentSystem } from '@/lib/mugtee-agents'

const pkg = runMugteeAgentSystem({
  idea: "A poor devotee's faith in Jagannath Ji changes his destiny.",
  durationSec: 60,
  language: 'hi',
})
```

Preserves named entities (e.g. Jagannath Ji). Animation style locked to Pixar-inspired stylised 3D. Wired into Quick Cut at pipeline start.
