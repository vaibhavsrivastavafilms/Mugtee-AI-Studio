export function CinematicSeparator({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/12 to-transparent ${className}`}
      aria-hidden
    />
  )
}
