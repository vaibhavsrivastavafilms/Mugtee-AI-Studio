'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Film,
  Youtube,
  Clapperboard,
  Zap,
  LayoutPanelTop,
  Video,
  ChevronDown,
} from 'lucide-react'

const quickActions = [
  {
    title: 'Viral Reel',
    icon: Film,
  },
  {
    title: 'YouTube Script',
    icon: Youtube,
  },
  {
    title: 'Documentary Script',
    icon: Clapperboard,
  },
  {
    title: 'Hook Generator',
    icon: Zap,
  },
  {
    title: 'Storyboard',
    icon: LayoutPanelTop,
  },
  {
    title: 'Faceless Video',
    icon: Video,
  },
]

const navItems = [
  'Create',
  'Scripts',
  'Storyboards',
  'Voiceovers',
  'Library',
  'Settings',
]

export default function WorkspacePage() {
  const [idea, setIdea] = useState('')
  const [platform, setPlatform] =
    useState('Instagram')

  const [tone, setTone] =
    useState('Cinematic')

  const [niche, setNiche] =
    useState('Storytelling')

  const [loading, setLoading] =
    useState(false)

  const [result, setResult] = useState<any>(null)

  async function handleGenerate() {
    if (!idea.trim()) return

    try {
      setLoading(true)

      const response = await fetch(
        '/api/ai/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idea,
            platform,
            tone,
            niche,
          }),
        }
      )

      const data = await response.json()

      setResult(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,72,22,0.22),transparent_45%)] pointer-events-none" />

      {/* Navbar */}
      <header className="relative z-20 border-b border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#D4AF37] text-black flex items-center justify-center font-bold text-lg shadow-lg shadow-yellow-500/10">
              M
            </div>

            <span className="text-[#E7C56A] text-2xl font-semibold tracking-tight">
              Mugtee
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-10">
            {navItems.map((item, index) => (
              <button
                key={item}
                className={`text-sm transition-all duration-300 ${
                  index === 0
                    ? 'text-[#E7C56A]'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          {/* Profile */}
          <div className="w-11 h-11 rounded-full border border-[#E7C56A]/40 flex items-center justify-center text-[#E7C56A]">
            M
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex items-center justify-center px-6 py-24">
        <div className="w-full max-w-5xl mx-auto text-center">
          {/* Hero */}
          <motion.div
            initial={{
              opacity: 0,
              y: 16,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
            }}
          >
            <p className="text-[#C8A24E] tracking-[0.35em] uppercase text-xs md:text-sm mb-6">
              Creator Workspace
            </p>

            <h1 className="text-5xl md:text-7xl leading-[1.05] font-semibold tracking-tight max-w-4xl mx-auto text-[#F4E7C1]">
              From idea to reel —
              <br />
              in one prompt.
            </h1>

            <p className="max-w-2xl mx-auto mt-8 text-white/70 text-lg leading-8">
              Type your idea, pick a platform,
              and Mugtee will draft the hook,
              full script, storyboard beats,
              captions and thumbnail concept.
            </p>

            <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-white/55">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />

                Mugtee detects emotional pacing
              </div>

              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />

                Optimized for short-form
                storytelling
              </div>
            </div>
          </motion.div>

          {/* Prompt Card */}
          <motion.div
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.15,
              duration: 0.6,
            }}
            className="mt-16 bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-[32px] p-8 md:p-10 shadow-2xl shadow-black/40"
          >
            {/* Textarea */}
            <textarea
              value={idea}
              onChange={(e) =>
                setIdea(e.target.value)
              }
              placeholder="Type your cinematic idea..."
              className="w-full bg-transparent outline-none resize-none text-2xl md:text-3xl placeholder:text-white/25 min-h-[120px]"
            />

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <SelectButton
                label={platform}
                onClick={() =>
                  setPlatform('Instagram')
                }
              />

              <SelectButton
                label={tone}
                onClick={() =>
                  setTone('Cinematic')
                }
              />

              <SelectButton
                label={niche}
                onClick={() =>
                  setNiche('Storytelling')
                }
              />

              {/* Generate */}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="h-16 rounded-2xl bg-[#D4AF37] hover:bg-[#E7C56A] transition-all duration-300 text-black font-semibold flex items-center justify-center gap-2 shadow-xl shadow-yellow-500/10 disabled:opacity-50"
              >
                <Sparkles className="w-5 h-5" />

                {loading
                  ? 'Generating...'
                  : 'Generate'}
              </button>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.25,
              duration: 0.6,
            }}
            className="mt-16"
          >
            <p className="text-[#C8A24E] uppercase tracking-[0.35em] text-xs mb-8">
              Quick Start
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon

                return (
                  <button
                    key={action.title}
                    onClick={() =>
                      setIdea(action.title)
                    }
                    className="group px-6 py-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 flex items-center gap-3 text-white/80 hover:text-white"
                  >
                    <Icon className="w-4 h-4 text-[#D4AF37]" />

                    <span className="text-sm">
                      {action.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Result */}
          {result && (
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
              }}
              className="mt-16 text-left bg-white/[0.03] border border-white/10 rounded-[32px] p-8 md:p-10"
            >
              <h2 className="text-3xl font-semibold text-[#F4E7C1] mb-8">
                Generated Output
              </h2>

              <div className="space-y-8">
                {/* Hook */}
                <div>
                  <h3 className="text-[#D4AF37] text-sm uppercase tracking-[0.25em] mb-3">
                    Hook
                  </h3>

                  <p className="text-white/80 leading-8">
                    {result.hook ||
                      'Your generated hook will appear here.'}
                  </p>
                </div>

                {/* Script */}
                <div>
                  <h3 className="text-[#D4AF37] text-sm uppercase tracking-[0.25em] mb-3">
                    Script
                  </h3>

                  <p className="text-white/80 leading-8 whitespace-pre-wrap">
                    {result.script ||
                      'Your generated script will appear here.'}
                  </p>
                </div>

                {/* Captions */}
                <div>
                  <h3 className="text-[#D4AF37] text-sm uppercase tracking-[0.25em] mb-3">
                    Captions
                  </h3>

                  <p className="text-white/80 leading-8">
                    {result.captions ||
                      'Your generated captions will appear here.'}
                  </p>
                </div>

                {/* Thumbnail */}
                <div>
                  <h3 className="text-[#D4AF37] text-sm uppercase tracking-[0.25em] mb-3">
                    Thumbnail Idea
                  </h3>

                  <p className="text-white/80 leading-8">
                    {result.thumbnail ||
                      'Your thumbnail idea will appear here.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}

function SelectButton({
  label,
  onClick,
}: {
  label: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="h-16 rounded-2xl border border-white/10 bg-black/40 px-5 flex items-center justify-between text-white/70 hover:border-[#D4AF37]/30 transition-all duration-300"
    >
      <span>{label}</span>

      <ChevronDown className="w-4 h-4 opacity-60" />
    </button>
  )
}