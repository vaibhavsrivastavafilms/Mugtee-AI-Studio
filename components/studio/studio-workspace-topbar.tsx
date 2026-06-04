'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  Command,
  HelpCircle,
  Pencil,
  Redo2,
  Search,
  Undo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STUDIO } from '@/lib/create/routes'
import { relSavedLabel } from '@/stores/cinematic-project'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useRewriteStore } from '@/stores/rewrite-store'
import { HeaderRightActions } from '@/components/shell/cinematic-header-app-actions'
import { SaveStatusIndicator } from '@/components/quick-cut/generation-save-indicator'
import { ModeSwitcher } from '@/components/studio/mode-switcher'

type StudioWorkspaceTopbarProps = {
  user: {
    email?: string | null
    user_metadata?: Record<string, unknown>
  }
  className?: string
}

export function StudioWorkspaceTopbar({ user, className }: StudioWorkspaceTopbarProps) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const saveState = useQuickCutGenerationStore((s) => s.saveState)
  const lastSavedAt = useQuickCutGenerationStore((s) => s.lastSavedAt)

  const undoRewrite = useRewriteStore((s) => s.undoRewrite)
  const redoRewrite = useRewriteStore((s) => s.redoRewrite)
  const canUndo = useRewriteStore((s) => s.undoStack.length > 0)
  const canRedo = useRewriteStore((s) => s.redoStack.length > 0)

  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)

  useEffect(() => {
    if (!editingTitle) setDraftTitle(title)
  }, [title, editingTitle])

  const openPalette = useCallback(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    )
  }, [])

  const savedLabel = relSavedLabel(lastSavedAt)
  const showSaved = saveState === 'saved' || (savedLabel && saveState !== 'saving')

  return (
    <header
      className={cn(
        'shrink-0 flex items-center gap-3 px-3 sm:px-4 h-12 border-b border-white/[0.06] bg-[#0D0D0F]/95 backdrop-blur-xl',
        className
      )}
    >
      <div className="hidden sm:flex shrink-0">
        <ModeSwitcher />
      </div>

      <div className="hidden md:flex items-center gap-2 min-w-0 max-w-[200px] lg:max-w-[240px]">
        {editingTitle ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={() => {
              useQuickCutGenerationStore.setState({
                title: draftTitle.trim() || 'Untitled Reel',
              })
              setEditingTitle(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                useQuickCutGenerationStore.setState({
                  title: draftTitle.trim() || 'Untitled Reel',
                })
                setEditingTitle(false)
              }
              if (e.key === 'Escape') {
                setDraftTitle(title)
                setEditingTitle(false)
              }
            }}
            className="w-full h-7 px-2 rounded-md bg-white/[0.04] border border-studio-primary/40 text-sm text-luxe focus:outline-none"
          />
        ) : (
          <>
            <span className="text-sm font-medium text-luxe truncate">
              {title.trim() || 'Untitled Reel'}
            </span>
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="shrink-0 p-1 rounded text-luxe/40 hover:text-luxe/80 transition"
              aria-label="Edit project title"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {showSaved ? (
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-emerald-400/90 shrink-0">
            <Check className="w-3 h-3" />
            {savedLabel ? `Saved ${savedLabel}` : 'Saved'}
          </span>
        ) : (
          <SaveStatusIndicator persistent={false} />
        )}
      </div>

      <button
        type="button"
        onClick={openPalette}
        className={cn(
          'flex-1 max-w-xl mx-auto hidden md:flex items-center gap-2 h-9 px-3 rounded-full',
          'border border-white/[0.08] bg-white/[0.03] text-luxe/45 hover:border-studio-primary/30 hover:bg-studio-primary-muted transition'
        )}
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[12px] truncate">
          <span className="text-luxe/35 mr-1">⌘K</span>
          Search or run command…
        </span>
      </button>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-auto">
        <button
          type="button"
          disabled={!canUndo}
          onClick={() => undoRewrite()}
          className="p-2 rounded-lg text-luxe/50 hover:text-luxe hover:bg-white/[0.04] disabled:opacity-30 transition"
          aria-label="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={() => redoRewrite()}
          className="p-2 rounded-lg text-luxe/50 hover:text-luxe hover:bg-white/[0.04] disabled:opacity-30 transition"
          aria-label="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="hidden sm:flex p-2 rounded-lg text-luxe/50 hover:text-luxe hover:bg-white/[0.04] transition"
          aria-label="Help"
          title="Studio shortcuts: ⌘K commands"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={openPalette}
          className="md:hidden p-2 rounded-lg text-luxe/50 hover:text-studio-primary transition"
          aria-label="Commands"
        >
          <Command className="w-4 h-4" />
        </button>
        <HeaderRightActions user={user} />
      </div>
    </header>
  )
}
