'use client'

export function MugteeWorldBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#050505]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(212,175,55,0.14),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_85%_20%,rgba(212,175,55,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_10%_80%,rgba(20,20,20,0.9),transparent_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#050505_0%,#0D0D0D_55%,#050505_100%)] opacity-80" />

      <div className="mugtee-world-drift absolute -left-20 top-24 h-80 w-80 rounded-full bg-[#D4AF37]/[0.06] blur-3xl" />
      <div className="mugtee-world-drift absolute -right-24 top-48 h-96 w-96 rounded-full bg-[#D4AF37]/[0.04] blur-3xl" />
      <div className="mugtee-world-drift absolute bottom-8 left-1/3 h-72 w-72 rounded-full bg-white/[0.02] blur-3xl" />

      <div className="mugtee-world-sparkle absolute left-[8%] top-[18%] h-1 w-1 rounded-full bg-[#D4AF37]/70" />
      <div className="mugtee-world-sparkle absolute left-[18%] top-[74%] h-1 w-1 rounded-full bg-[#D4AF37]/40" />
      <div className="mugtee-world-sparkle absolute left-[78%] top-[22%] h-1.5 w-1.5 rounded-full bg-[#D4AF37]/50" />
      <div className="mugtee-world-sparkle absolute left-[88%] top-[68%] h-1 w-1 rounded-full bg-white/30" />
      <div className="mugtee-world-sparkle absolute left-[42%] top-[40%] h-0.5 w-0.5 rounded-full bg-white/25" />
      <div className="mugtee-world-sparkle absolute left-[62%] top-[58%] h-1 w-1 rounded-full bg-[#D4AF37]/35" />

      <div className="mugtee-film-grain absolute inset-0" />
    </div>
  )
}
