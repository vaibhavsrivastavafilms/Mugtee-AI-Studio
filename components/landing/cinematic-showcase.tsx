'use client'
// Mugtee Landing — Cinematic Showcase (Phase 2C).
//
// One quiet emotional-proof section below the hero. Static curated artifacts
// (frame · hook · script snippet · caption) rotate softly every ~5s.
//
// Pure local state. No API, no streaming, no realtime generation.
// External images are CDN-hosted (Pexels / Unsplash) — no new repo assets.

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Sparkles, Camera } from 'lucide-react'

type Showcase = {
  topic: string
  imageUrl: string
  hook: string
  script: string
  caption: string
  platform: string
}

const SHOWCASES: Showcase[] = [
  {
    topic: 'A father teaching filmmaking',
    imageUrl: 'https://images.pexels.com/photos/33645190/pexels-photo-33645190.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=640',
    hook: '"He never said he loved me. He filmed it instead."',
    script:
      'Scene 1  \u00b7  [0:00]\n' +
      'Visual:    A dusty camera bag opens. One Polaroid falls out.\n' +
      'Voiceover: "Every Sunday, he made me hold the focus ring."\n' +
      'Camera:    Macro detail, single warm key from window-left.',
    caption:
      'Some lessons aren\u2019t spoken. They\u2019re framed.\n\n' +
      'Save this for the one who taught you to see. \ud83c\udf3e\n\n' +
      '#shortfilm #storytelling #fatherandson #cinematicreels #mugtee',
    platform: 'YouTube Short',
  },
  {
    topic: 'Rain that smelled like home',
    imageUrl: 'https://images.unsplash.com/photo-1670324382035-f9cfacc3b59b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwyfHxjaW5lbWF0aWMlMjBwb3J0cmFpdHxlbnwwfHx8fDE3NzkzOTIyNDV8MA&ixlib=rb-4.1.0&q=85&w=640&h=900&fit=crop',
    hook: '"Some cities don\u2019t forget who waited for you."',
    script:
      'Scene 1  \u00b7  [0:00]\n' +
      'Visual:    Window glass beaded with rain. A teacup quietly steams.\n' +
      'Voiceover: "Mumbai had a way of finding me before I found anyone."\n' +
      'Camera:    Slow push-in, 50mm, shallow depth of field.',
    caption:
      'Monsoons taught me a language nobody spoke.\n\n' +
      'Save this for the one who waited at your old window.\n\n' +
      '#monsoon #mumbai #cinematicreels #storytelling #mugtee',
    platform: 'Instagram Reel',
  },
  {
    topic: 'The last order',
    imageUrl: 'https://images.pexels.com/photos/29202430/pexels-photo-29202430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=640',
    hook: '"He cooked for 40 years. One plate stayed empty every Sunday."',
    script:
      'Scene 1  \u00b7  [0:00]\n' +
      'Visual:    An empty corner table. One folded menu, one untouched glass.\n' +
      'Voiceover: "She used to sit there. She doesn\u2019t come anymore."\n' +
      'Camera:    Locked-off wide, dim warm tungsten, dust drifting.',
    caption:
      'Forty years. One empty chair. The whole story.\n\n' +
      'Save this for the kitchens that kept loving long after.\n\n' +
      '#shortfilm #emotional #cinematicreels #storytelling #mugtee',
    platform: 'Instagram Reel',
  },
]

export default function CinematicShowcase() {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (SHOWCASES.length <= 1) return
    const id = setInterval(() => setI((n) => (n + 1) % SHOWCASES.length), 5400)
    return () => clearInterval(id)
  }, [])

  const s = SHOWCASES[i]

  return (
    <section id="showcase" className="relative px-5 sm:px-6 py-20 sm:py-24">
      <div className="container max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">
            Made with Mugtee
          </div>
          <h2 className="font-display text-3xl sm:text-4xl leading-tight">
            Real cinematic <span className="text-gold-gradient">artifacts</span>, not stock samples.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-luxe/60">
            Each panel below is the kind of output Mugtee produces from a single prompt.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-5 lg:gap-6 items-stretch">
          {/* LEFT — cinematic frame */}
          <div className="lg:col-span-2">
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-gold-soft bg-black/40 shadow-gold-glow">
              {/* key remounts the image so the next showcase swaps in cleanly without lingering frames */}
              <Image
                key={s.imageUrl}
                src={s.imageUrl}
                alt={`Storyboard frame for ${s.topic}`}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                priority={i === 0}
                className="object-cover transition-opacity duration-700 ease-out"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/65 backdrop-blur-sm text-[9.5px] tracking-[0.22em] uppercase text-gold-300/90 flex items-center gap-1.5">
                <Camera className="w-3 h-3" /> Frame 01
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-[10px] tracking-[0.22em] uppercase text-luxe/55 mb-1">Prompt</p>
                <p className="text-[13px] text-luxe italic leading-snug">"{s.topic}"</p>
              </div>
            </div>
          </div>

          {/* RIGHT — Hook · Script · Caption */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <Artifact label="Hook" key={`hook-${i}`}>
              <p className="text-[15.5px] sm:text-base leading-relaxed text-luxe font-display italic">
                {s.hook}
              </p>
            </Artifact>
            <Artifact label="Script" key={`script-${i}`}>
              <pre className="whitespace-pre-wrap break-words text-[12.5px] leading-[1.7] text-luxe/85 font-sans">
                {s.script}
              </pre>
            </Artifact>
            <Artifact label="Caption" key={`caption-${i}`}>
              <pre className="whitespace-pre-wrap break-words text-[12.5px] leading-[1.7] text-luxe/85 font-sans">
                {s.caption}
              </pre>
              <div className="mt-2 text-[9.5px] tracking-[0.22em] uppercase text-gold-300/85">
                {s.platform}
              </div>
            </Artifact>
          </div>
        </div>

        {/* Soft pagination dots — quiet motion, no buttons that demand attention */}
        <div className="mt-7 flex items-center justify-center gap-1.5" aria-hidden="true">
          {SHOWCASES.map((_, idx) => (
            <span
              key={idx}
              className={`h-[3px] rounded-full transition-all duration-700 ease-out ${
                idx === i ? 'w-7 bg-gold-300/80' : 'w-3 bg-luxe/15'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function Artifact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl glass-strong border border-gold-soft p-4 sm:p-5 flex-1">
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-2">
        <Sparkles className="w-3 h-3" /> {label}
      </div>
      {children}
    </div>
  )
}
