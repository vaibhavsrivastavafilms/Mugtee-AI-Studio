# Mugtee Cinematic Story Engine

Automatic idea → cinematic production intelligence.

Creator enters **one idea**. Mugtee never asks them to write prompts, split scenes, or engineer consistency.

## Automatic workflow

1. **Understand** — genre, emotion, audience, characters, setting, conflict, ending  
2. **Story structure** — beginning → conflict → journey → climax → resolution  
3. **Screenplay** — timed scenes with camera, lighting, emotion, transitions  
4. **Character Bible** — locked identity for every frame  
5. **Environment Bible** — locked world for every frame  
6. **Scene prompts** — production prompts (hidden unless Advanced Mode)  
7–14. Handed to Production OS V3/V4 for images, animation, voice, music, edit, export  

## Module

`lib/cinematic-story-engine/`

| File | Role |
|------|------|
| `understand.ts` | Idea extraction |
| `story-structure.ts` | Five-act structure |
| `screenplay.ts` | Auto scene split |
| `scene-prompts.ts` | Production prompts |
| `run.ts` | Full package + session persist |

## Entry

```ts
import { runCinematicStoryEngine } from '@/lib/cinematic-story-engine'

const pkg = runCinematicStoryEngine({
  idea: "A poor boy's faith changes his destiny.",
  durationSec: 60,
})
```

Also produced by the **Mugtee Agent System** (`lib/mugtee-agents`) via `toCinematicStoryPackage()` for storyboard prompt injection. Agents 1–7 feed this package; Agents 8–12 run through Production OS.
