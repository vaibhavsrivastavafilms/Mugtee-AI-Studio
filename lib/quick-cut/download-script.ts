import { exportScriptAsDoc } from '@/lib/export-docx'
import { slugifyExportBase } from '@/lib/quick-cut/download-scene-image'

export function buildQuickCutScriptText(input: {
  title: string
  hook: string
  script: string
  scriptBeats?: { narration: string; duration: string; emotion: string }[]
  payoff?: string
  cta?: string
  isUnlimited?: boolean
}): string {
  const sections: string[] = []
  if (input.title.trim()) sections.push(`TITLE\n${input.title.trim()}`)
  if (input.hook.trim()) sections.push(`HOOK\n${input.hook.trim()}`)
  if (input.scriptBeats?.length) {
    const beatsBlock = input.scriptBeats
      .map(
        (b, i) =>
          `[BEAT ${i + 1}${b.duration ? ` · ${b.duration}` : ''}${b.emotion ? ` · ${b.emotion}` : ''}]\n${b.narration}`
      )
      .join('\n\n')
    sections.push(`NARRATION BEATS\n${beatsBlock}`)
  } else if (input.script.trim()) {
    sections.push(`SCRIPT\n${input.script.trim()}`)
  }
  if (input.payoff?.trim()) sections.push(`PAYOFF\n${input.payoff.trim()}`)
  if (input.cta?.trim()) sections.push(`CTA\n${input.cta.trim()}`)

  const body = sections.join('\n\n')
  if (input.isUnlimited) return body
  return `${body}\n\n---\nMade with Mugtee · AI Production OS for creators · https://mugtee.in\n`
}

function scriptBaseName(title: string): string {
  return slugifyExportBase(title || 'mugtee-script', 'mugtee-script')
}

export function downloadScriptTxt(input: {
  title: string
  hook: string
  script: string
  scriptBeats?: { narration: string; duration: string; emotion: string }[]
  payoff?: string
  cta?: string
  isUnlimited?: boolean
}): void {
  if (
    !input.script.trim() &&
    !input.hook.trim() &&
    !input.title.trim() &&
    !(input.scriptBeats?.length)
  ) {
    return
  }

  const content = buildQuickCutScriptText(input)
  const filename = `${scriptBaseName(input.title)}.txt`
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function downloadScriptDoc(input: {
  title: string
  hook: string
  script: string
  scriptBeats?: { narration: string; duration: string; emotion: string }[]
  payoff?: string
  cta?: string
  isUnlimited?: boolean
}): void {
  if (
    !input.script.trim() &&
    !input.hook.trim() &&
    !input.title.trim() &&
    !(input.scriptBeats?.length)
  ) {
    return
  }

  const body = buildQuickCutScriptText(input)
  exportScriptAsDoc({
    title: input.title.trim() || 'Mugtee Script',
    body,
    isUnlimited: input.isUnlimited,
  })
}
