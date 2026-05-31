import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { AnalyticsBoot } from '@/components/analytics/analytics-boot'
import { ServiceWorkerRegister } from '@/components/pwa/sw-register'
import { InstallMugteeBanner } from '@/components/pwa/install-mugtee-banner'
import { OfflineGate } from '@/components/app/offline-gate'
import { AppBootstrapProvider } from '@/components/app/app-bootstrap-provider'
import { getCanonicalSiteUrl } from '@/lib/url'

const SITE_URL = getCanonicalSiteUrl()
const SITE_NAME = 'Mugtee'
const SITE_TAGLINE = 'AI Production OS for Creators'
const SITE_DESCRIPTION = 'Cinematic AI workspace for creators, agencies, and brands. Plan, script, schedule, and ship viral content — all in one premium production hub.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} \u00b7 ${SITE_TAGLINE}`,
    template: `%s \u00b7 ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  generator: 'Next.js',
  keywords: [
    'AI for creators', 'content production OS', 'viral video AI',
    'cinematic AI scriptwriter', 'faceless YouTube AI', 'content calendar AI',
    'social media planner', 'Instagram automation', 'YouTube intelligence',
    'creator workflow', 'production pipeline SaaS',
  ],
  referrer: 'origin-when-cross-origin',
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} \u00b7 ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [{ url: '/logo.png', width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} \u00b7 ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    creator: '@mugtee',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true, follow: true, 'max-image-preview': 'large',
      'max-snippet': -1, 'max-video-preview': -1,
    },
  },
  category: 'technology',
  // Phase P10 — PWA / Capacitor mobile metadata (static manifest under /public)
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.png',
    apple: '/icons/apple-icon.png',
  },
   
  
  appleWebApp: {
    capable: true,
    title: 'Mugtee',
    statusBarStyle: 'black-translucent',
    startupImage: ['/icons/apple-touch-icon.png'],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Mugtee',
    'application-name': 'Mugtee',
    'msapplication-TileColor': '#0B0B0B',
    'msapplication-TileImage': '/icons/icon-192.png',
    'format-detection': 'telephone=no',
  },

  
} 
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B0B0B' },
    { media: '(prefers-color-scheme: light)', color: '#0B0B0B' },
  ],
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  // Phase P10 — let the WebView extend under the status bar so safe-area-pad can manage padding
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-7958251746228863'
  return (
    <html lang="en" className="dark">
      <head>{/* suppress PerformanceServerTiming DataCloneError */}<script dangerouslySetInnerHTML={{ __html: 'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);' }} />{adsenseClient ? <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`} crossOrigin="anonymous" /> : null}</head>
      <body className="min-h-screen bg-background text-foreground antialiased scrollbar-luxe">
        {/* V4.0 — PostHog + first-party analytics bootstrapped once per browser tab. */}
        <AnalyticsBoot />
        {/* PWA — offline shell + static precache (production only). */}
        <ServiceWorkerRegister />
        {/* PWA — Android install banner (Chrome / Edge). */}
        <InstallMugteeBanner />
        <OfflineGate>
          <AppBootstrapProvider>{children}</AppBootstrapProvider>
        </OfflineGate>
        <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: 'rgba(20,16,12,0.95)', border: '1px solid rgba(212,175,55,0.25)', color: '#E8D9A8' } }} />
      </body>
    </html>
  )
}
