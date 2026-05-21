'use client'
// MUGTEE V3.9 — Compact pricing FAQ accordion.
//
// Pure CSS open/close via the native <details> element \u2014 zero JS state, zero
// re-render cost, zero new deps. Cinematic black/gold styling reuses the
// existing glass + gold-soft tokens from globals.css.

import { ChevronDown, HelpCircle } from 'lucide-react'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Does Mugtee support Hindi, Gujarati and Hinglish?',
    a: 'Yes. Mugtee AI Studio supports multilingual scripting, narration and assistant workflows. Generate scripts in your native language and switch the narrator voice per project.',
  },
  {
    q: 'What platforms can I publish to?',
    a: 'Instagram and YouTube publishing workflows are supported \u2014 with platform-aware scripting, scheduling and analytics. More platforms are added as creators request them.',
  },
  {
    q: 'What happens when free credits run out?',
    a: 'You can recharge credits anytime from the Pricing page, or earn bonus credits through sponsor rewards and the in-app "Watch Ad \u2192 +5 credits" reward (up to 3 times per day).',
  },
  {
    q: 'Can I generate voiceovers?',
    a: 'Yes. Mugtee supports multilingual cinematic voice generation with multiple speaker styles \u2014 Indian Male, Indian Female, American Male, American Female and Cinematic broadcaster.',
  },
  {
    q: 'Can teams collaborate?',
    a: 'Yes. Agency Studio supports shared workspaces, collaborative production pipelines, real-time sync and team-wide AI usage. Book a demo to see the team workflow live.',
  },
]

export function PricingFaq() {
  return (
    <section className="mt-16 sm:mt-20 max-w-3xl mx-auto" id="faq">
      <div className="text-center mb-7">
        <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-gold-300/85">
          <HelpCircle className="w-3 h-3" /> Frequently asked
        </div>
        <h2 className="font-display text-2xl sm:text-3xl mt-2 leading-tight">
          Everything you need before you upgrade
        </h2>
      </div>
      <div className="space-y-2.5">
        {FAQS.map((f, i) => (
          <details
            key={i}
            className="group rounded-xl glass border border-white/[0.06] hover:border-gold-500/30 open:border-gold-500/40 open:shadow-cinema transition overflow-hidden"
          >
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 select-none">
              <span className="text-[13px] sm:text-[14px] text-luxe font-medium leading-snug pr-2">{f.q}</span>
              <span className="shrink-0 w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] inline-flex items-center justify-center text-gold-300/80 group-open:bg-gold-500/15 group-open:border-gold-500/40 group-open:rotate-180 transition">
                <ChevronDown className="w-3.5 h-3.5" />
              </span>
            </summary>
            <div className="px-4 sm:px-5 pb-4 -mt-0.5 text-[12.5px] sm:text-[13px] text-luxe/75 leading-relaxed">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

export default PricingFaq
