/** @type {import('next').NextConfig} */

const path = require('path')

const reactRoot = path.dirname(require.resolve('react/package.json'))
const reactDomRoot = path.dirname(require.resolve('react-dom/package.json'))

const nextConfig = {
  // Standalone file tracing fails on Windows (ENOENT in collect-build-traces).
  // Set NEXT_OUTPUT_STANDALONE=1 for self-hosted Docker/Linux builds only.
  ...(process.env.NEXT_OUTPUT_STANDALONE === '1' ? { output: 'standalone' } : {}),

  serverExternalPackages: [
    'ffmpeg-static',
    'mongodb',
    '@remotion/renderer',
    '@remotion/bundler',
    'remotion',
  ],

  outputFileTracingIncludes: {
    '/api/render/reel': ['./lib/remotion/compositions/**/*'],
    '/api/quick-cut/config': ['./lib/remotion/compositions/**/*'],
    '/api/reels/export': ['./lib/remotion/compositions/**/*'],
    '/api/timeline/render': ['./lib/remotion/compositions/**/*'],
  },

  experimental: {
    optimizePackageImports: ['framer-motion'],
  },

  turbopack: {
    // Single React instance — @react-three/fiber breaks if Turbopack resolves a second copy.
    resolveAlias: {
      react: reactRoot,
      'react-dom': reactDomRoot,
    },
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'oikvspgxllujvgyxatbb.supabase.co', pathname: '/storage/v1/object/**' },
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.pexels.com', pathname: '/**' },
      { protocol: 'https', hostname: 'image.pollinations.ai', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'yt3.ggpht.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'oaidalleapiprodscus.blob.core.windows.net', pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: '**.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: 'replicate.delivery', pathname: '/**' },
    ],
  },

  webpack(config, { dev }) {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: reactRoot,
      'react-dom': reactDomRoot,
    }

    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules'],
      }
    }

    return config
  },

  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },

  async rewrites() {
    return [
      // Standalone deploys omit /public — serve Next metadata manifest at /manifest.json.
      { source: '/manifest.json', destination: '/manifest.webmanifest' },
    ]
  },

  async headers() {
    // Cross-origin isolation for browser MP4 export (SharedArrayBuffer + threaded ffmpeg.wasm).
    // credentialless COEP: enables crossOriginIsolated in Chromium while allowing Supabase/CDN
    // images with crossOrigin="anonymous". same-origin-allow-popups COOP: OAuth popups work.
    const crossOriginIsolationHeaders = [
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
    ]

    const crossOriginIsolationRoutes = [
      '/create/:path*',
      '/quick-cut/:path*',
      '/workspace',
      '/workspace/:path*',
      '/project/:path*',
      '/cinematic/:path*',
    ]

    const studioCrossOriginIsolationHeaders = [
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
    ]

    return [
      {
        source: '/ffmpeg/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/studio/:path*',
        headers: studioCrossOriginIsolationHeaders,
      },
      ...crossOriginIsolationRoutes.map((source) => ({
        source,
        headers: crossOriginIsolationHeaders,
      })),
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

module.exports = nextConfig