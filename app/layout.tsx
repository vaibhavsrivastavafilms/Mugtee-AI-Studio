import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mugtee.in'
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
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} \u00b7 ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    creator: '@mugtee',
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
  // Phase P10 — PWA / Capacitor mobile metadata
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Mugtee',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Mugtee',
    'application-name': 'Mugtee',
    'msapplication-TileColor': '#0a0807',
    'format-detection': 'telephone=no',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0807' },
    { media: '(prefers-color-scheme: light)', color: '#0a0807' },
  ],
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  // Phase P10 — let the WebView extend under the status bar so safe-area-pad can manage padding
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
        {/* Phase 16 — AdSense loader. Loaded lazily, only if a publisher ID is configured. */}
        {adsenseClient && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased scrollbar-luxe">
        {children}
        <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: 'rgba(20,16,12,0.95)', border: '1px solid rgba(212,175,55,0.25)', color: '#E8D9A8' } }} />
      </body>
    </html>
  )
}
