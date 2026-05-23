// Mugtee Landing — public MVP proof sections.
//
// Four lightweight blocks that improve clarity + trust for first-time visitors:
//   1. How Mugtee Works   — three-step, plain-English workflow
//   2. Real Output Preview — static mock outputs that prove the quality bar
//   3. Made For           — audience badge row
//   4. Final CTA          — Open Workspace + Try a Demo Prompt
//
// Pure server-renderable JSX. NO new dependencies. NO framer-motion (per spec).
// Reuses existing tokens: glass-strong · text-gold-gradient · border-gold-soft ·
// shadow-gold-glow · bg-gold-gradient · text-luxe.
import Link from 'next/link'
import { Sparkles, FileText, Save, Film, Zap, Image as ImageIcon } from 'lucide-react'

const STEPS = [
  {
    n: '01',
    title: 'Describe your idea',
    body: 'One sentence is enough. A memory, a feeling, a story \u2014 type it the way you would tell a friend.',
    icon: Sparkles,
  },
  {
    n: '02',
    title: 'Mugtee generates cinematic outputs',
    body: 'A hook, a full script, scene-by-scene storyboard, captions, and a thumbnail concept \u2014 in one pass.',
    icon: Film,
  },
  {
    n: '03',
    title: 'Save, export, and create',
    body: 'Copy to clipboard. Export as TXT or Markdown. Reopen any project, exactly where you left it.',
    icon: Save,
  },
]

const PREVIEW = {
  topic: 'A father teaching filmmaking',
  hook: '"He never said he loved me. He filmed it instead."',
  script:
    'Scene 1  \u00b7  [0:00]\n' +
    'Visual:    A dusty camera bag opens. One Polaroid falls out.\n' +
    'Voiceover: "Every Sunday, he made me hold the focus ring."\n' +
    'Camera:    Macro detail, single warm key from window-left.\n' +
    'Emotion:   Nostalgic \u00b7 tender',
  storyboard:
    '2. Establish\n' +
    '   Shot:       Wide environmental\n' +
    '   Framing:    Subject lower-third, ceiling fan in negative space\n' +
    '   Movement:   Slow push-in\n' +
    '   Lighting:   Window-left, fill bounced off white sheet\n' +
    '   Transition: Match-cut on hand reaching for the dial',
  thumbnail:
    'Composition:  Off-center portrait, subject occupies left third, deep negative space holds gold text.\n' +
    'Trigger:      A single quiet ache the viewer can name in one second.\n' +
    'Overlay text: "HE FILMED IT INSTEAD" \u2014 serif, set in the negative space.\n' +
    'Color mood:   Warm shadow + cold highlight (amber / teal split).',
}

const AUDIENCES = [
  'Filmmakers',
  'YouTubers',
  'Storytellers',
  'Creative Agencies',
  'Instagram Creators',
]

export default function ProofSections() {
  return (
    <>
      {/* ─── 1. HOW MUGTEE WORKS ───────────────────────────────────── */}
      <section id="how-it-works" className="relative px-5 sm:px-6 py-20 sm:py-24">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">How Mugtee Works</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">
              Three steps from <span className="text-gold-gradient">idea</span> to <span className="text-gold-gradient">reel</span>.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-luxe/65">
              Built for creators who would rather tell stories than wrestle with software.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl glass-strong border border-gold-soft p-5 sm:p-6 hover:border-gold-500/40 transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80">{s.n}</span>
                  <div className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold-glow">
                    <s.icon className="w-4 h-4 text-black" />
                  </div>
                </div>
                <h3 className="font-display text-lg sm:text-xl text-luxe leading-tight mb-2">{s.title}</h3>
                <p className="text-[13.5px] text-luxe/60 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 2. REAL OUTPUT PREVIEW ────────────────────────────────── */}
      <section id="preview" className="relative px-5 sm:px-6 py-20 sm:py-24">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">Real Output</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">
              This is what Mugtee actually <span className="text-gold-gradient">writes</span>.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-luxe/65">
              A live preview from a single prompt — no editing, no rewrites.
            </p>
          </div>

          <div className="rounded-2xl glass-strong border border-gold-soft p-5 sm:p-7 max-w-3xl mx-auto">
            <div className="text-[10px] tracking-[0.22em] uppercase text-luxe/45 mb-1">Prompt</div>
            <p className="text-[14px] text-luxe italic mb-6">"{PREVIEW.topic}"</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <PreviewBlock icon={Zap} label="Hook" body={PREVIEW.hook} />
              <PreviewBlock icon={FileText} label="Script" body={PREVIEW.script} />
              <PreviewBlock icon={Film} label="Storyboard" body={PREVIEW.storyboard} />
              <PreviewBlock icon={ImageIcon} label="Thumbnail" body={PREVIEW.thumbnail} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. MADE FOR ───────────────────────────────────────────── */}
      <section className="relative px-5 sm:px-6 py-14 sm:py-16">
        <div className="container max-w-4xl mx-auto text-center">
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-4">Made For</div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
            {AUDIENCES.map((a) => (
              <span
                key={a}
                className="px-3.5 py-1.5 rounded-full text-[12.5px] text-luxe/85 bg-white/[0.035] border border-white/[0.08] hover:border-gold-500/35 hover:text-gold-200 transition"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. FINAL CTA ──────────────────────────────────────────── */}
      <section className="relative px-5 sm:px-6 py-20 sm:py-24">
        <div className="container max-w-3xl mx-auto text-center">
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">Start Creating</div>
          <h2 className="font-display text-3xl sm:text-4xl leading-tight mb-4">
            Start creating with <span className="text-gold-gradient">Mugtee</span>.
          </h2>
          <p className="text-sm sm:text-base text-luxe/65 max-w-xl mx-auto mb-7">
            One prompt to a cinematic reel — hook, script, storyboard, captions, thumbnail.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/workspace"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold-gradient text-black font-medium text-sm shadow-gold-glow hover:opacity-90 transition"
            >
              <Sparkles className="w-4 h-4" /> Open Workspace
            </Link>
            <Link
              href="/workspace?demo=father-teaching-filmmaking"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/[0.04] border border-gold-500/30 text-luxe hover:text-gold-200 hover:border-gold-500/60 text-sm transition"
            >
              Try a Demo Prompt
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function PreviewBlock({
  icon: Icon, label, body,
}: { icon: React.ComponentType<any>; label: string; body: string }) {
  return (
    <div className="rounded-xl bg-black/30 border border-white/[0.05] p-4">
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-2">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <pre className="whitespace-pre-wrap break-words text-[12.5px] leading-[1.7] text-luxe/85 font-sans">
        {body}
      </pre>
    </div>
  )
}
