/** @type {import('next').NextConfig} */

const nextConfig = {
  // Standalone file tracing fails on Windows (ENOENT in collect-build-traces).
  // Set NEXT_OUTPUT_STANDALONE=1 for self-hosted Docker/Linux builds only.
  ...(process.env.NEXT_OUTPUT_STANDALONE === '1' ? { output: 'standalone' } : {}),

  experimental: {
    optimizePackageImports: ['framer-motion'],
    // Next 14.2: keep native/heavy packages out of webpack bundles (avoids BSON OOM at build).
    serverComponentsExternalPackages: [
      'ffmpeg-static',
      'mongodb',
      '@remotion/renderer',
      '@remotion/bundler',
      'remotion',
    ],
  },

  images: {
    remotePatterns: [
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
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig