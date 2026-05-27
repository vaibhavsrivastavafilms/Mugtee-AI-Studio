'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
  Copy,
  Check,
  Save,
  FolderOpen,
  Download,
  FileText,
} from 'lucide-react'

type GenerationResult = {
  hook: string
  script: string
  storyboard: string
  captions: string
  thumbnail: string
}

const exampleGenerations = [
  {
    title:
      'A lonely astronaut returns to Earth',
    category: 'Sci-Fi Story',
  },

  {
    title:
      'A boxer trains after losing everything',
    category: 'Motivational',
  },

  {
    title:
      'A villain explains why he became evil',
    category: 'Cinematic Monologue',
  },

  {
    title:
      'A detective discovers the city is fake',
    category: 'Mystery Thriller',
  },
]
const featuredOutputs = [
  {
    title:
      'The Last Astronaut',
    category: 'Sci-Fi Reel',
    views: '3.2M views',
  },

  {
    title:
      'Why Villains Become Monsters',
    category:
      'Cinematic Monologue',
    views: '920K views',
  },

  {
    title:
      'The Boxer Who Lost Everything',
    category:
      'Motivational Story',
    views: '1.8M views',
  },
]
const quickActions = [
  {
    title: 'Viral Reel',
    icon: Film,
    prompt:
      'Create a viral Instagram reel with emotional storytelling',
  },

  {
    title: 'YouTube Script',
    icon: Youtube,
    prompt:
      'Create a cinematic YouTube storytelling script',
  },

  {
    title: 'Documentary Script',
    icon: Clapperboard,
    prompt:
      'Write a dramatic documentary narration',
  },

  {
    title: 'Hook Generator',
    icon: Zap,
    prompt:
      'Generate emotional high-retention hooks',
  },

  {
    title: 'Storyboard',
    icon: LayoutPanelTop,
    prompt:
      'Create cinematic storyboard scene beats',
  },

  {
    title: 'Faceless Video',
    icon: Video,
    prompt:
      'Create a faceless cinematic short-form concept',
  },
]

const navItems = [
  'Create',
  'Scripts',
  'Storyboards',
  'Library',
  'Settings',
]

export default function WorkspacePage() {
  const searchParams = useSearchParams()

  const projectId = searchParams?.get('id') ?? null

  const [idea, setIdea] = useState('')

  const [platform, setPlatform] =
    useState('Instagram')

  const [tone, setTone] =
    useState('Cinematic')

  const [niche, setNiche] =
    useState('Storytelling')

  const [loading, setLoading] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [result, setResult] =
    useState<GenerationResult | null>(null)

  useEffect(() => {
    if (projectId) {
      loadProject(projectId)
    }
  }, [projectId])

  async function loadProject(id: string) {
    try {
      const response = await fetch(
        `/api/projects/${id}`
      )

      const data = await response.json()

      setIdea(data.idea)

      setPlatform(data.platform)

      setTone(data.tone)

      setNiche(data.niche)

      setResult(data.result)
    } catch (error) {
      console.error(error)
    }
  }

  async function handleGenerate() {
    if (!idea.trim()) return

    try {
      setLoading(true)

      const response = await fetch(
        '/api/ai/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
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

  async function handleSaveProject() {
    if (!result) return

    try {
      setSaving(true)

      const response = await fetch(
        '/api/projects/save',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            idea,
            platform,
            tone,
            niche,
            result,
          }),
        }
      )

      await response.json()

      alert(
        'Project saved successfully!'
      )
    } catch (error) {
      console.error(error)

      alert('Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyAll() {
    if (!result) return

    const content = `
IDEA
${idea}

HOOK
${result.hook}

SCRIPT
${result.script}

STORYBOARD
${result.storyboard}

CAPTIONS
${result.captions}

THUMBNAIL
${result.thumbnail}
    `

    await navigator.clipboard.writeText(
      content
    )

    alert('Copied to clipboard!')
  }

  function handleExportTXT() {
    if (!result) return

    const content = `
IDEA
${idea}

HOOK
${result.hook}

SCRIPT
${result.script}

STORYBOARD
${result.storyboard}

CAPTIONS
${result.captions}

THUMBNAIL
${result.thumbnail}
    `

    const blob = new Blob([content], {
      type: 'text/plain',
    })

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement('a')

    link.href = url

    link.download =
      'mugtee-project.txt'

    link.click()

    URL.revokeObjectURL(url)
  }

  function handleExportMarkdown() {
    if (!result) return

    const content = `
# Mugtee Project

## Idea
${idea}

## Hook
${result.hook}

## Script
${result.script}

## Storyboard
${result.storyboard}

## Captions
${result.captions}

## Thumbnail Concept
${result.thumbnail}
    `

    const blob = new Blob([content], {
      type: 'text/markdown',
    })

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement('a')

    link.href = url

    link.download =
      'mugtee-project.md'

    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,72,22,0.22),transparent_45%)] pointer-events-none" />

      {/* Navbar */}
      <header className="relative z-20 border-b border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/workspace"
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#D4AF37] text-black flex items-center justify-center font-bold text-lg">
              M
            </div>

            <span className="text-[#E7C56A] text-2xl font-semibold tracking-tight">
              Mugtee
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            {navItems.map(
              (item, index) => (
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
              )
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link
              href="/projects"
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-[#D4AF37]/30 transition-all duration-300"
            >
              <FolderOpen className="w-4 h-4" />

              Projects
            </Link>

            <div className="w-11 h-11 rounded-full border border-[#D4AF37]/40 flex items-center justify-center text-[#E7C56A]">
              M
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 px-6 py-24">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
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
              duration: 0.6,
            }}
            className="text-center"
          >
            <p className="text-[#C8A24E] uppercase tracking-[0.35em] text-xs mb-6">
              Creator Workspace
            </p>

            <h1 className="text-5xl md:text-7xl leading-[1.05] font-semibold tracking-tight max-w-4xl mx-auto text-[#F4E7C1]">
              From idea to reel —
              <br />
              in one prompt.
            </h1>

            <p className="max-w-2xl mx-auto mt-8 text-white/70 text-lg leading-8">
              Generate cinematic hooks,
              storytelling scripts,
              captions and storyboard concepts
              for short-form creators.
            </p>
          </motion.div>

          {/* Prompt Card */}
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
              delay: 0.1,
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
              className="w-full bg-transparent outline-none resize-none text-2xl md:text-3xl placeholder:text-white/25 min-h-[140px]"
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

                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-black animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-black animate-bounce delay-100" />
                    <div className="w-2 h-2 rounded-full bg-black animate-bounce delay-200" />
                  </div>
                ) : (
                  'Generate'
                )}
              </button>
            </div>
          </motion.div>

          {/* Example Generations */}
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.15,
              duration: 0.6,
            }}
            className="mt-16"
          >
            <p className="text-[#C8A24E] uppercase tracking-[0.35em] text-xs mb-8 text-center">
              Example Generations
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {exampleGenerations.map(
                (example) => (
                  <button
                    key={example.title}
                    onClick={() =>
                      setIdea(
                        example.title
                      )
                    }
                    className="text-left p-6 rounded-[28px] border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] hover:border-[#D4AF37]/20 transition-all duration-300"
                  >
                    <p className="text-[#D4AF37] text-xs uppercase tracking-[0.25em] mb-4">
                      {example.category}
                    </p>

                    <h3 className="text-2xl text-[#F4E7C1] leading-snug font-medium">
                      {example.title}
                    </h3>
                  </button>
                )
              )}
            </div>
          </motion.div>
{/* Featured Creator Outputs */}
<motion.div
  initial={{
    opacity: 0,
  }}
  animate={{
    opacity: 1,
  }}
  transition={{
    delay: 0.18,
    duration: 0.6,
  }}
  className="mt-20"
>
  <div className="text-center mb-10">
    <p className="text-[#C8A24E] uppercase tracking-[0.35em] text-xs mb-4">
      Featured Creator Outputs
    </p>

    <h2 className="text-3xl md:text-4xl font-semibold text-[#F4E7C1]">
      Stories creators are building.
    </h2>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {featuredOutputs.map(
      (output) => (
        <div
          key={output.title}
          className="rounded-[32px] overflow-hidden border border-white/10 bg-white/[0.03] hover:border-[#D4AF37]/20 transition-all duration-300"
        >
          {/* Thumbnail */}
          <div className="h-[220px] bg-gradient-to-br from-[#2B1A08] via-[#120D08] to-black relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_60%)]" />

            <div className="absolute bottom-6 left-6 right-6">
              <p className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] mb-3">
                {output.category}
              </p>

              <h3 className="text-2xl font-semibold text-[#F4E7C1] leading-tight">
                {output.title}
              </h3>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 flex items-center justify-between">
            <span className="text-white/50 text-sm">
              {output.views}
            </span>

            <button
              onClick={() =>
                setIdea(output.title)
              }
              className="text-[#D4AF37] hover:text-[#E7C56A] transition-all duration-300 text-sm"
            >
              Use Prompt
            </button>
          </div>
        </div>
      )
    )}
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
              delay: 0.2,
              duration: 0.6,
            }}
            className="mt-16"
          >
            <p className="text-[#C8A24E] uppercase tracking-[0.35em] text-xs mb-8 text-center">
              Quick Start
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              {quickActions.map(
                (action) => {
                  const Icon =
                    action.icon

                  return (
                    <button
                      key={action.title}
                      onClick={() =>
                        setIdea(
                          action.prompt
                        )
                      }
                      className="group px-6 py-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 flex items-center gap-3 text-white/80 hover:text-white"
                    >
                      <Icon className="w-4 h-4 text-[#D4AF37]" />

                      <span className="text-sm">
                        {action.title}
                      </span>
                    </button>
                  )
                }
              )}
            </div>
          </motion.div>

          {/* Export Buttons */}
          {result && (
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              <button
                onClick={handleCopyAll}
                className="px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300 flex items-center gap-3 text-white/80 hover:text-white"
              >
                <Copy className="w-4 h-4 text-[#D4AF37]" />

                Copy All
              </button>

              <button
                onClick={handleExportTXT}
                className="px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300 flex items-center gap-3 text-white/80 hover:text-white"
              >
                <Download className="w-4 h-4 text-[#D4AF37]" />

                Export TXT
              </button>

              <button
                onClick={
                  handleExportMarkdown
                }
                className="px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300 flex items-center gap-3 text-white/80 hover:text-white"
              >
                <FileText className="w-4 h-4 text-[#D4AF37]" />

                Export MD
              </button>
            </div>
          )}

          {/* Save */}
          {result && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={
                  handleSaveProject
                }
                disabled={saving}
                className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black font-medium hover:bg-[#E7C56A] transition-all duration-300 shadow-xl shadow-yellow-500/10 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />

                {saving
                  ? 'Saving...'
                  : 'Save Project'}
              </button>
            </div>
          )}

          {/* Output */}
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
              className="mt-20 space-y-8"
            >
              <OutputCard
                title="Hook"
                content={result.hook}
              />

              <OutputCard
                title="Script"
                content={result.script}
              />

              <OutputCard
                title="Storyboard"
                content={
                  result.storyboard
                }
              />

              <OutputCard
                title="Captions"
                content={
                  result.captions
                }
              />

              <OutputCard
                title="Thumbnail Concept"
                content={
                  result.thumbnail
                }
              />
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

function OutputCard({
  title,
  content,
}: {
  title: string
  content: string
}) {
  const [copied, setCopied] =
    useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(
      content
    )

    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-8 md:p-10 text-left backdrop-blur-xl">
      <div className="flex items-center justify-between mb-6">
        <p className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs">
          {title}
        </p>

        <button
          onClick={handleCopy}
          className="px-4 py-2 rounded-xl border border-white/10 text-sm text-white/70 hover:text-white hover:border-[#D4AF37]/30 transition-all duration-300 flex items-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

      <div className="text-white/80 leading-8 whitespace-pre-wrap text-lg">
        {content}
      </div>
    </div>
  )
}