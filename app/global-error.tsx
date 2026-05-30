'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          textAlign: 'center',
          background: '#0B0B0B',
          color: '#E8D9A8',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          aria-hidden
          style={{
            width: 64,
            height: 64,
            marginBottom: 24,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 28,
            color: '#0B0B0B',
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5E6A8 100%)',
          }}
        >
          M
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
          Mugtee is temporarily unavailable
        </h1>
        <p style={{ fontSize: '0.875rem', opacity: 0.7, maxWidth: 360, margin: '0 0 1.5rem' }}>
          A critical error occurred. Please refresh the page or try again in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            height: 40,
            padding: '0 1.25rem',
            borderRadius: 9999,
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            color: '#0B0B0B',
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5E6A8 100%)',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
