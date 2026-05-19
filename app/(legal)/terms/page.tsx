import type { Metadata } from 'next'
import Link from 'next/link'
import { ScrollText, AlertTriangle, UserCheck, Ban, CreditCard, RefreshCw, Scale, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing your use of ViralForgeAI — acceptable use, AI content, intellectual property, billing, and termination.',
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-6 sm:p-7 mb-5 border border-white/[0.05]">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg glass-gold flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-gold-300" />
        </div>
        <h2 className="font-display text-xl sm:text-2xl">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-luxe/85 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

export default function TermsPage() {
  const updated = 'June 2025'
  return (
    <>
      <div className="mb-9">
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 mb-2">Effective {updated}</div>
        <h1 className="font-display text-4xl sm:text-5xl mb-3"><span className="text-gold-gradient">Terms</span> of Service</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          The boring-but-important bit. By using ViralForgeAI you agree to these terms. We've tried to keep them short and human.
        </p>
      </div>

      <Section icon={UserCheck} title="Acceptance & eligibility">
        <p>By creating an account or using ViralForgeAI (“the Service”), you agree to these Terms and our <Link href="/privacy" className="text-gold-300 hover:underline">Privacy Policy</Link>. You must be at least 13 years old and capable of forming a binding contract in your jurisdiction.</p>
      </Section>

      <Section icon={ScrollText} title="Your content & our content">
        <p><strong className="text-luxe">You own what you create.</strong> Scripts, ideas, captions, media, and other content you produce in ViralForgeAI remain yours. You grant us a limited license to store, display, and process your content solely to operate the Service.</p>
        <p><strong className="text-luxe">We own the platform.</strong> The ViralForgeAI software, design, UI, brand, and underlying models are protected by copyright, trademark, and other laws. You may not copy, resell, or reverse-engineer the Service.</p>
      </Section>

      <Section icon={AlertTriangle} title="AI output — know what you're shipping">
        <p>ViralForgeAI generates content using third-party large language models. <strong className="text-luxe">Output is suggestions, not facts.</strong> You are responsible for reviewing, fact-checking, and editing any AI output before publishing.</p>
        <p>You may use AI-generated content commercially, but you accept full responsibility for what you publish, including compliance with copyright, defamation, advertising, and platform rules (YouTube, Meta, TikTok, etc.).</p>
      </Section>

      <Section icon={Ban} title="Acceptable use">
        <p>Don't use ViralForgeAI to generate, schedule, or publish content that is illegal, infringing, deceptive, sexually explicit involving minors, harassing, or designed to spread disinformation or manipulate elections. We reserve the right to suspend accounts that violate these rules or the policies of connected platforms.</p>
      </Section>

      <Section icon={CreditCard} title="Subscriptions & billing">
        <p>Paid plans (Creator ₹245/month, Agency ₹999/month) are billed monthly via Razorpay until you cancel. Plans auto-renew at the start of each billing cycle. Cancel any time — your plan remains active until the end of the current period; we don't issue partial refunds for unused time except where required by law.</p>
        <p>Free-plan caps (AI generations, scripts, weekly plans) reset monthly. Rewarded sponsor credits are best-effort and may be discontinued at any time.</p>
      </Section>

      <Section icon={RefreshCw} title="Service changes & availability">
        <p>We're shipping fast. Features may change, be added, or removed without prior notice. We aim for high uptime but offer no SLA during beta. Scheduled maintenance and integration outages (Google, Meta, OpenAI, etc.) are outside our control.</p>
      </Section>

      <Section icon={Scale} title="Disclaimers & limitation of liability">
        <p>The Service is provided “as is” without warranties of any kind. To the maximum extent permitted by law, ViralForgeAI and its operators are not liable for indirect, incidental, or consequential damages arising from use of the Service, including lost revenue, lost followers, or platform penalties from content you chose to publish.</p>
        <p>Our total aggregate liability for any claim is capped at the amount you paid us in the 12 months preceding the claim.</p>
      </Section>

      <Section icon={Mail} title="Termination & contact">
        <p>You can delete your account any time from Settings or by emailing us. We can suspend or terminate accounts that violate these Terms, with notice where reasonable.</p>
        <p>Questions: <a href="mailto:hello@viralforge.ai" className="text-gold-300 hover:underline">hello@viralforge.ai</a></p>
      </Section>
    </>
  )
}
