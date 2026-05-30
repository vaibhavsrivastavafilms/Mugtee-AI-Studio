'use client'

/** Profile fetch failed — app stays online; user can retry from settings or refresh. */
export function ProfileErrorBanner() {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/90"
    >
      <p className="font-medium text-red-100">Could not load your profile</p>
      <p className="mt-1 text-red-100/80 leading-relaxed">
        Your session is active, but profile data did not load. Billing and trial status may be
        outdated until you refresh or visit Settings.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-3 text-[11px] tracking-wider uppercase text-red-200/90 hover:text-red-100 underline underline-offset-2"
      >
        Retry
      </button>
    </div>
  )
}
