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
      <head><style>{`
              .ge-body {
                margin: 0;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 1.5rem;
                text-align: center;
                background: #0B0B0B;
                color: #E8D9A8;
                font-family: Inter, system-ui, sans-serif;
              }
              .ge-logo {
                width: 64px;
                height: 64px;
                margin-bottom: 24px;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 28px;
                color: #0B0B0B;
                background: linear-gradient(135deg, #D4AF37 0%, #F5E6A8 100%);
              }
              .ge-title {
                font-size: 1.5rem;
                font-weight: 600;
                margin: 0 0 0.5rem;
              }
              .ge-desc {
                font-size: 0.875rem;
                opacity: 0.7;
                max-width: 360px;
                margin: 0 0 1.5rem;
              }
              .ge-btn {
                height: 40px;
                padding: 0 1.25rem;
                border-radius: 9999px;
                border: none;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                color: #0B0B0B;
                background: linear-gradient(135deg, #D4AF37 0%, #F5E6A8 100%);
              }
        `}</style></head>
      <body className="ge-body">
        <div className="ge-logo" aria-hidden>
          M
        </div>
        <h1 className="ge-title">Mugtee is temporarily unavailable</h1>
        <p className="ge-desc">
          A critical error occurred. Please refresh the page or try again in a moment.
        </p>
        <button type="button" className="ge-btn" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  )
}
