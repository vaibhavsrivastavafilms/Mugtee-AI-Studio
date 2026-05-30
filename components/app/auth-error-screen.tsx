'use client'

type AuthErrorScreenProps = {
  title?: string
  message?: string
  onRetry?: () => void
}

/** Auth/OAuth failures — never conflate with offline mode. */
export function AuthErrorScreen({
  title = 'Sign-in didn’t complete',
  message = 'Something went wrong during authentication. Please try signing in again.',
  onRetry,
}: AuthErrorScreenProps) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#0B0B0B] text-[#E8D9A8]">
      <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border border-red-500/30 bg-red-500/10 text-red-300 text-2xl font-bold">
        !
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">{title}</h1>
      <p className="text-sm text-[#E8D9A8]/70 max-w-sm">{message}</p>
      <a
        href="/auth/login"
        onClick={(e) => {
          if (onRetry) {
            e.preventDefault()
            onRetry()
          }
        }}
        className="mt-6 inline-flex items-center justify-center h-10 px-5 rounded-full text-sm font-medium"
        style={{
          background: 'linear-gradient(180deg,#E0C06E,#B48E3C)',
          color: '#0B0B0B',
        }}
      >
        Back to sign in
      </a>
    </main>
  )
}
