// Mugtee Landing — Phase 5 proof sections.
// Cinematic storytelling journey — not SaaS workflow.
import Link from 'next/link'
import { Sparkles, FileText, Film, Zap, Image as ImageIcon } from 'lucide-react'
import { PROOF } from '@/lib/marketing/site-copy'

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

export default function ProofSections() {
  return (
    <>
      <section id="how-it-works" className="relative px-5 sm:px-6 py-20 sm:py-24">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">{PROOF.eyebrow}</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">
              {PROOF.headline.split(' ').slice(0, 3).join(' ')}{' '}
              <span className="text-gold-gradient">{PROOF.headline.split(' ').slice(3).join(' ')}</span>.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-luxe/65">{PROOF.subheadline}</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
            {PROOF.steps.map((s, i) => (
              <div
                key={s.title}
                className="rounded-2xl glass-strong border border-gold-soft p-5 sm:p-6 hover:border-gold-500/40 transition story-experience-depth"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold-glow">
                    {i === 0 ? <Sparkles className="w-4 h-4 text-black" /> : i === 1 ? <Film className="w-4 h-4 text-black" /> : <FileText className="w-4 h-4 text-black" />}
                  </div>
                </div>
                <h3 className="font-display text-lg sm:text-xl text-luxe leading-tight mb-2">{s.title}</h3>
                <p className="text-[13.5px] text-luxe/60 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="preview" className="relative px-5 sm:px-6 py-20 sm:py-24">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">{PROOF.preview.eyebrow}</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">
              {PROOF.preview.headline.split(' ').slice(0, 2).join(' ')}{' '}
              <span className="text-gold-gradient">{PROOF.preview.headline.split(' ').slice(2).join(' ')}</span>.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-luxe/65">{PROOF.preview.subheadline}</p>
          </div>

          <div className="rounded-2xl glass-strong border border-gold-soft p-5 sm:p-7 max-w-3xl mx-auto narrative-immersion-opacity">
            <div className="text-[10px] tracking-[0.22em] uppercase text-luxe/45 mb-1">Emotional idea</div>
            <p className="text-[14px] text-luxe italic mb-6">&ldquo;{PREVIEW.topic}&rdquo;</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <PreviewBlock icon={Zap} label="Hook" body={PREVIEW.hook} />
              <PreviewBlock icon={FileText} label="Script" body={PREVIEW.script} />
              <PreviewBlock icon={Film} label="Storyboard" body={PREVIEW.storyboard} />
              <PreviewBlock icon={ImageIcon} label="Visual mood" body={PREVIEW.thumbnail} />
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-5 sm:px-6 py-14 sm:py-16">
        <div className="container max-w-4xl mx-auto text-center">
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-4">For storytellers who</div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
            {PROOF.audiences.map((a) => (
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

      <section className="relative px-5 sm:px-6 py-20 sm:py-24">
        <div className="container max-w-3xl mx-auto text-center">
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">Begin directing</div>
          <h2 className="font-display text-3xl sm:text-4xl leading-tight mb-4">
            Enter your <span className="text-gold-gradient">cinematic world</span>.
          </h2>
          <p className="text-sm sm:text-base text-luxe/65 max-w-xl mx-auto mb-7">
            One emotional idea — hook, storyboard, atmosphere, and immersive presentation held as one arc.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md sm:max-w-none mx-auto">
            <Link
              href="/login?next=%2Fcinematic%2Fcreate"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gold-gradient text-black font-medium text-sm shadow-gold-glow hover:opacity-90 transition"
            >
              <Sparkles className="w-4 h-4" /> Enter the cinematic studio
            </Link>
            <Link
              href="/cinematic/examples/psychology-attention"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/[0.04] border border-gold-500/30 text-luxe hover:text-gold-200 hover:border-gold-500/60 text-sm transition"
            >
              Experience an authored world
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
