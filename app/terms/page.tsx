import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, FileText, Scale, Sparkles, CreditCard, Shield, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Mugtee AI Studio — subscriptions, AI content, and creator responsibilities.',
}

function Section({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7 mb-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-gold-300" />
        </div>
        <h2 className="font-display text-xl sm:text-2xl text-[#E8D9A8]">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-[#E8D9A8]/80 leading-relaxed">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  const updated = 'May 2026'
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#E8D9A8]">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a0a]/80 border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-14 flex items-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm hover:text-gold-200 transition">
            <ChevronLeft className="w-4 h-4 text-gold-300" />
            <span className="font-display text-gold-gradient">Mugtee</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14 pb-16">
        <p className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 mb-2">Effective {updated}</p>
        <h1 className="font-display text-4xl sm:text-5xl mb-3">
          <span className="text-gold-gradient">Terms</span> of Service
        </h1>
        <p className="text-sm text-[#E8D9A8]/60 leading-relaxed max-w-xl mb-10">
          These terms govern your use of Mugtee AI Studio (web, PWA, and Android app). By using Mugtee you agree to them.
        </p>

        <Section icon={Scale} title="The service">
          <p>
            Mugtee AI Studio provides AI-assisted tools for planning, scripting, generating, and exporting creator content.
            Features may change during beta. We strive for uptime but do not guarantee uninterrupted access.
          </p>
        </Section>

        <Section icon={Sparkles} title="AI-generated content">
          <p>
            Outputs from AI models are suggestions, not professional advice. You are responsible for reviewing accuracy,
            rights, and suitability before publishing. Mugtee does not warrant that generated content is original,
            non-infringing, or fit for any platform&apos;s policies.
          </p>
        </Section>

        <Section icon={Shield} title="Your account & conduct">
          <p>
            Keep your login secure. Do not abuse APIs, scrape the service, reverse-engineer paid features, or upload
            unlawful content. We may suspend accounts that violate these terms or harm other users.
          </p>
        </Section>

        <Section icon={CreditCard} title="Billing">
          <p>
            Paid plans are processed by Razorpay (or other processors we disclose at checkout). Subscriptions renew until
            cancelled. Refunds follow our published refund policy and applicable law. Free-tier limits may change with notice.
          </p>
        </Section>

        <Section icon={FileText} title="Intellectual property">
          <p>
            You retain rights to content you create. Mugtee retains rights to the product, brand, and underlying software.
            You grant us a limited license to host and process your content solely to operate the service.
          </p>
        </Section>

        <Section icon={Mail} title="Contact & changes">
          <p>
            Questions: <a href="mailto:legal@mugtee.in" className="text-gold-300 hover:underline">legal@mugtee.in</a>.
            We may update these terms; material changes will be posted on this page. Continued use after changes constitutes acceptance.
          </p>
          <p className="text-[11px] text-[#E8D9A8]/50 mt-4">
            See also our <Link href="/privacy" className="text-gold-300 hover:underline">Privacy Policy</Link>.
          </p>
        </Section>
      </main>
    </div>
  )
}
