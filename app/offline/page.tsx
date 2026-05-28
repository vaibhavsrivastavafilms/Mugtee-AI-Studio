// Mugtee PWA — minimal offline shell. Served by the SW when navigation fails.
// Kept intentionally tiny: no client JS, no fetches, no third-party imports.
export const dynamic = 'force-static'

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#0B0B0B] text-[#E8D9A8]">
      <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center"
           style={{ background: 'linear-gradient(180deg,#E0C06E,#B48E3C)', color: '#0B0B0B', fontWeight: 800, fontSize: 32 }}>M</div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">You’re offline</h1>
      <p className="text-sm text-[#E8D9A8]/70 max-w-sm">
        Mugtee AI Studio needs an internet connection to shape, save, and continue your cinematic work.
        Reconnect and we’ll pick up exactly where you left off.
      </p>
      <a href="/"
         className="mt-6 inline-flex items-center justify-center h-10 px-5 rounded-full text-sm font-medium"
         style={{ background: 'linear-gradient(180deg,#E0C06E,#B48E3C)', color: '#0B0B0B' }}>
        Try again
      </a>
    </main>
  )
}
