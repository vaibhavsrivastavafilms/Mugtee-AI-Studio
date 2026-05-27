'use client'

import {
  Download,
  Copy,
  FileText,
} from 'lucide-react'

type Props = {
  idea: string
  hook: string
  script: string
  captions: string
  thumbnail: string
}

export default function ExportButtons({
  idea,
  hook,
  script,
  captions,
  thumbnail,
}: Props) {
  async function handleCopyAll() {
    const content = `
IDEA
${idea}

HOOK
${hook}

SCRIPT
${script}

CAPTIONS
${captions}

THUMBNAIL
${thumbnail}
    `

    await navigator.clipboard.writeText(
      content
    )

    alert('Copied to clipboard!')
  }

  function handleExportTXT() {
    const content = `
IDEA
${idea}

HOOK
${hook}

SCRIPT
${script}

CAPTIONS
${captions}

THUMBNAIL
${thumbnail}
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
    const content = `
# Mugtee Project

## Idea
${idea}

## Hook
${hook}

## Script
${script}

## Captions
${captions}

## Thumbnail Concept
${thumbnail}
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
    <div className="flex flex-wrap justify-center gap-4">
      {/* Copy */}
      <button
        onClick={handleCopyAll}
        className="px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300 flex items-center gap-3 text-white/80 hover:text-white"
      >
        <Copy className="w-4 h-4 text-[#D4AF37]" />

        Copy All
      </button>

      {/* TXT */}
      <button
        onClick={handleExportTXT}
        className="px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300 flex items-center gap-3 text-white/80 hover:text-white"
      >
        <Download className="w-4 h-4 text-[#D4AF37]" />

        Export TXT
      </button>

      {/* Markdown */}
      <button
        onClick={handleExportMarkdown}
        className="px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300 flex items-center gap-3 text-white/80 hover:text-white"
      >
        <FileText className="w-4 h-4 text-[#D4AF37]" />

        Export MD
      </button>
    </div>
  )
}