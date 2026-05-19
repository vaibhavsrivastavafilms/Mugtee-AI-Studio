import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Lock, Database, Mail, Eye, FileWarning, Youtube, Instagram, CreditCard, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Mugtee collects, uses, and protects creator data — OAuth tokens, AI-generated content, billing, and YouTube/Instagram permissions.',
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

export default function PrivacyPage() {
  const updated = 'June 2025'
  return (
    <>
      <div className="mb-9">
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 mb-2">Effective {updated}</div>
        <h1 className="font-display text-4xl sm:text-5xl mb-3"><span className="text-gold-gradient">Privacy</span> Policy</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          Your creator workflow lives inside Mugtee. This policy explains exactly what we collect, why, where it lives, and how to revoke or delete it.
        </p>
      </div>

      <Section icon={Database} title="What we collect">
        <p><strong className="text-luxe">Account data</strong> — your email, Google profile name and avatar (from Google OAuth). We never see or store your Google password.</p>
        <p><strong className="text-luxe">Creator content</strong> — ideas, scripts, captions, schedules, media files, AI prompts and outputs you create inside the app. Stored in our Supabase database, scoped to your user ID via row-level security.</p>
        <p><strong className="text-luxe">Integration tokens</strong> — short-lived access tokens and long-lived refresh tokens for YouTube, Instagram (Meta Graph), and other connected channels. Stored server-side only, protected by row-level security. Never exposed to the browser.</p>
        <p><strong className="text-luxe">Billing data</strong> — subscription status, plan, and Razorpay subscription ID. We never see or store your card details — those live with Razorpay.</p>
        <p><strong className="text-luxe">Telemetry</strong> — lightweight usage counts (AI generations, scripts, planner runs) stored locally in your browser to enforce free-plan caps. Aggregated server-side analytics may include page paths and timestamps. No advertising IDs, no cross-site trackers.</p>
      </Section>

      <Section icon={Eye} title="How we use it">
        <p>Solely to run the app you signed up for — generate content, schedule posts, publish to your connected channels, track your plan, and improve product quality. We do not sell or rent your data. We do not use your content to train third-party AI models.</p>
      </Section>

      <Section icon={Sparkles} title="AI-generated content disclaimer">
        <p>Scripts, captions, hooks, and other content produced by Mugtee's AI engines (OpenAI GPT-4o-mini, Anthropic Claude 3.5 Sonnet via Emergent's universal key) are <strong className="text-luxe">generated suggestions</strong>, not verified facts. You are responsible for reviewing, editing, and verifying any AI output before publishing it to your audience. Mugtee does not guarantee accuracy, originality, or fitness for any particular use.</p>
        <p>Your prompts and inputs are sent to the underlying model providers under their respective privacy policies. We pass them through; we do not retain them for training.</p>
      </Section>

      <Section icon={Youtube} title="YouTube data — limited-use disclosure">
        <p>When you connect YouTube via Google OAuth, Mugtee requests two scopes only:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><code className="text-gold-200/90 bg-white/[0.04] px-1.5 py-0.5 rounded text-xs">youtube.upload</code> — upload videos to your channel</li>
          <li><code className="text-gold-200/90 bg-white/[0.04] px-1.5 py-0.5 rounded text-xs">youtube.readonly</code> — read your channel ID and title (to confirm the right account)</li>
        </ul>
        <p>We never access your subscribers, comments, DMs, watch history, or any other channel data. Our use of YouTube API services adheres to the <a href="https://developers.google.com/youtube/terms/api-services-terms-of-service" target="_blank" rel="noopener" className="text-gold-300 hover:underline">YouTube API Services Terms of Service</a> and the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" className="text-gold-300 hover:underline">Google Privacy Policy</a>. You can revoke access any time at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener" className="text-gold-300 hover:underline">myaccount.google.com/permissions</a>, or click <em>Disconnect</em> inside Settings.</p>
      </Section>

      <Section icon={Instagram} title="Instagram / Meta data">
        <p>When you connect Instagram, we request only the permissions needed to publish to your linked Professional Instagram account (via the Meta Graph API): <code className="text-gold-200/90 bg-white/[0.04] px-1.5 py-0.5 rounded text-xs">instagram_basic</code>, <code className="text-gold-200/90 bg-white/[0.04] px-1.5 py-0.5 rounded text-xs">instagram_content_publish</code>, <code className="text-gold-200/90 bg-white/[0.04] px-1.5 py-0.5 rounded text-xs">pages_show_list</code>, <code className="text-gold-200/90 bg-white/[0.04] px-1.5 py-0.5 rounded text-xs">pages_read_engagement</code>. We don't read your DMs, comments, or follower data.</p>
      </Section>

      <Section icon={CreditCard} title="Billing & subscriptions">
        <p>Subscription payments are processed by Razorpay. We store the Razorpay subscription ID, plan, and status only. You can cancel any time from your Razorpay subscriber portal or by contacting us — your plan stays active until the end of the current billing period.</p>
        <p>Test-mode billing (during beta) does not generate real charges.</p>
      </Section>

      <Section icon={Lock} title="Security">
        <p>All transit is TLS-encrypted. OAuth tokens and integration credentials are stored server-side behind row-level security (each user can only access their own row). Authentication is handled by Supabase Auth using PKCE.</p>
      </Section>

      <Section icon={FileWarning} title="Your rights">
        <p>You can view, export, or delete your data any time. Email us at the address below and we'll respond within 30 days. Disconnect any integration from <Link href="/settings" className="text-gold-300 hover:underline">Settings</Link> to revoke access tokens immediately.</p>
      </Section>

      <Section icon={Mail} title="Contact">
        <p>Privacy questions, deletion requests, data exports: <a href="mailto:privacy@mugtee.in" className="text-gold-300 hover:underline">privacy@mugtee.in</a></p>
      </Section>

      <p className="text-[11px] text-muted-foreground/80 leading-relaxed mt-8">
        This policy may evolve as we ship new features. Material changes will be announced inside the app and reflected on this page.
      </p>
    </>
  )
}
