'use client'
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef, useMemo } from 'react'
import { createSupabaseBrowserClient } from './supabase/client'
import { toast } from 'sonner'
import type { ContentPiece, CrewMember, Shoot, MediaAsset, ActivityItem, ContentStatus } from './types'

interface Workspace {
  id?: string
  name: string
  logo_url?: string | null
  theme?: string | null
}

interface Loading {
  content: boolean
  crew: boolean
  shoots: boolean
  media: boolean
  activity: boolean
  initial: boolean
}

export interface TrashItem { id: string; title: string; deleted_at: string; archived: boolean; table: 'content_pieces' | 'crew' | 'shoots' | 'media' }

interface Store {
  userId: string
  userName: string
  workspace: Workspace
  loading: Loading

  // Active rows (not deleted, not archived)
  content: ContentPiece[]
  crew: CrewMember[]
  shoots: Shoot[]
  media: MediaAsset[]
  activity: ActivityItem[]

  // Archived (not deleted)
  archivedContent: ContentPiece[]
  archivedCrew: CrewMember[]
  archivedShoots: Shoot[]
  archivedMedia: MediaAsset[]

  // CONTENT
  addContent: (input: Partial<ContentPiece>) => Promise<string | undefined>
  updateContent: (id: string, patch: Partial<ContentPiece>) => Promise<void>
  removeContent: (id: string) => Promise<void>           // soft delete
  archiveContent: (id: string) => Promise<void>
  restoreContent: (id: string) => Promise<void>
  setStatus: (id: string, status: ContentStatus) => Promise<void>

  // CREW
  addCrew: (input: Partial<CrewMember>) => Promise<void>
  updateCrew: (id: string, patch: Partial<CrewMember>) => Promise<void>
  removeCrew: (id: string) => Promise<void>
  archiveCrew: (id: string) => Promise<void>
  restoreCrew: (id: string) => Promise<void>

  // SHOOTS
  addShoot: (input: Partial<Shoot>) => Promise<void>
  updateShoot: (id: string, patch: Partial<Shoot>) => Promise<void>
  removeShoot: (id: string) => Promise<void>
  archiveShoot: (id: string) => Promise<void>
  restoreShoot: (id: string) => Promise<void>

  // MEDIA
  addMedia: (input: Partial<MediaAsset>) => Promise<void>
  removeMedia: (id: string) => Promise<void>
  archiveMedia: (id: string) => Promise<void>
  restoreMedia: (id: string) => Promise<void>

  // Workspace
  updateWorkspace: (patch: Partial<Workspace>) => Promise<void>
  restoreDefaults: () => Promise<void>

  // Trash
  loadTrash: () => Promise<TrashItem[]>
  restoreFromTrash: (table: TrashItem['table'], id: string) => Promise<void>
  permanentlyDelete: (table: TrashItem['table'], id: string) => Promise<void>
  clearTrash: () => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

function titleOf(table: string, row: any): string {
  if (table === 'crew') return row.name || 'Unnamed'
  return row.title || 'Untitled'
}

export function StoreProvider({ userId, userName, children }: { userId: string; userName: string; children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [content, setContent] = useState<ContentPiece[]>([])
  const [crew, setCrew]       = useState<CrewMember[]>([])
  const [shoots, setShoots]   = useState<Shoot[]>([])
  const [media, setMedia]     = useState<MediaAsset[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [archivedContent, setArchivedContent] = useState<ContentPiece[]>([])
  const [archivedCrew, setArchivedCrew] = useState<CrewMember[]>([])
  const [archivedShoots, setArchivedShoots] = useState<Shoot[]>([])
  const [archivedMedia, setArchivedMedia] = useState<MediaAsset[]>([])
  const [workspace, setWorkspace] = useState<Workspace>({ name: 'My Studio', logo_url: null, theme: 'gold' })
  const [loading, setLoading] = useState<Loading>({ content: true, crew: true, shoots: true, media: true, activity: true, initial: true })

  // Apply theme attribute on html element whenever workspace.theme changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const t = workspace.theme && workspace.theme !== 'gold' ? workspace.theme : ''
      if (t) document.documentElement.setAttribute('data-theme', t)
      else document.documentElement.removeAttribute('data-theme')
    }
  }, [workspace.theme])

  // ---------- helpers ----------
  const logActivity = useCallback(async (action: string, target: string) => {
    try { await supabase.from('team_activity').insert({ user_id: userId, actor: userName, action, target }) }
    catch (e) { console.error('logActivity', e) }
  }, [supabase, userId, userName])

  // Phase 5B: lightweight notification helper. Inline insert; never blocks UI.
  const notify = useCallback(async (payload: { title: string; message?: string | null; type?: string; link?: string | null }) => {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: payload.title,
        message: payload.message ?? null,
        type: payload.type ?? 'info',
        link: payload.link ?? null,
      })
    } catch (e) { console.error('notify', e) }
  }, [supabase, userId])

  const handleError = useCallback((e: any, fallback: string) => {
    console.error(e); toast.error(e?.message || fallback)
  }, [])

  // ---------- initial load (no seeding) ----------
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const baseQ = (table: string) => supabase.from(table).select('*').is('deleted_at', null)
        const [c, cr, sh, md, ac, ws] = await Promise.all([
          baseQ('content_pieces').order('created_at', { ascending: false }),
          baseQ('crew').order('created_at', { ascending: true }),
          baseQ('shoots').order('date', { ascending: true }),
          baseQ('media').order('created_at', { ascending: false }),
          supabase.from('team_activity').select('*').order('created_at', { ascending: false }).limit(30),
          supabase.from('workspaces').select('*').eq('user_id', userId).maybeSingle(),
        ])
        if (cancelled) return

        const split = <T extends { archived?: boolean | null }>(rows: T[]) => ({
          active: rows.filter(r => !r.archived),
          archived: rows.filter(r => !!r.archived),
        })
        const cSplit  = split<any>((c.data as any) || [])
        const crSplit = split<any>((cr.data as any) || [])
        const shSplit = split<any>((sh.data as any) || [])
        const mdSplit = split<any>((md.data as any) || [])

        setContent(cSplit.active);   setArchivedContent(cSplit.archived)
        setCrew(crSplit.active);     setArchivedCrew(crSplit.archived)
        setShoots(shSplit.active);   setArchivedShoots(shSplit.archived)
        setMedia(mdSplit.active);    setArchivedMedia(mdSplit.archived)
        setActivity((ac.data as any) || [])

        if (ws.data) setWorkspace(ws.data as any)
        else {
          const { data: created } = await supabase.from('workspaces').insert({ user_id: userId, name: 'My Studio', theme: 'gold' }).select().single()
          if (created && !cancelled) setWorkspace(created as any)
        }
      } catch (e) {
        handleError(e, 'Could not load studio data')
      } finally {
        if (!cancelled) setLoading({ content: false, crew: false, shoots: false, media: false, activity: false, initial: false })
      }
    }
    load()
    return () => { cancelled = true }
  }, [supabase, userId, handleError])

  // ---------- realtime ----------
  useEffect(() => {
    const filter = `user_id=eq.${userId}`
    const handlers: Array<{ table: string; setActive: any; setArchived?: any }> = [
      { table: 'content_pieces', setActive: setContent, setArchived: setArchivedContent },
      { table: 'crew',           setActive: setCrew,    setArchived: setArchivedCrew },
      { table: 'shoots',         setActive: setShoots,  setArchived: setArchivedShoots },
      { table: 'media',          setActive: setMedia,   setArchived: setArchivedMedia },
      { table: 'team_activity',  setActive: setActivity },
    ]

    const channels = handlers.map(({ table, setActive, setArchived }) =>
      supabase.channel(`rt-${table}-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter }, (payload: any) => {
          const row = (payload.new || payload.old) as any
          if (!row) return
          if (payload.eventType === 'DELETE') {
            setActive((prev: any[]) => prev.filter(x => x.id !== row.id))
            setArchived?.((prev: any[]) => prev.filter(x => x.id !== row.id))
            return
          }
          // INSERT or UPDATE
          if (row.deleted_at) {
            // soft-deleted from elsewhere
            setActive((prev: any[]) => prev.filter(x => x.id !== row.id))
            setArchived?.((prev: any[]) => prev.filter(x => x.id !== row.id))
            return
          }
          if (row.archived) {
            setActive((prev: any[]) => prev.filter(x => x.id !== row.id))
            setArchived?.((prev: any[]) => {
              const i = prev.findIndex(x => x.id === row.id)
              if (i === -1) return [row, ...prev]
              const next = prev.slice(); next[i] = row; return next
            })
          } else {
            setArchived?.((prev: any[]) => prev.filter(x => x.id !== row.id))
            setActive((prev: any[]) => {
              const i = prev.findIndex(x => x.id === row.id)
              if (i === -1) return [row, ...prev]
              const next = prev.slice(); next[i] = row; return next
            })
          }
        })
        .subscribe()
    )

    const wsChannel = supabase
      .channel(`rt-workspaces-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces', filter }, (payload: any) => {
        if (payload.new) setWorkspace(payload.new as any)
      }).subscribe()

    return () => { channels.forEach(c => supabase.removeChannel(c)); supabase.removeChannel(wsChannel) }
  }, [supabase, userId])

  // ===========================================================================
  //                              CRUD HELPERS
  // ===========================================================================

  // Generic soft-delete helper
  const softDelete = useCallback(async (table: string, id: string, setActive: any, setArchived: any, label: string) => {
    const ts = new Date().toISOString()
    setActive((prev: any[]) => prev.filter(x => x.id !== id))
    setArchived?.((prev: any[]) => prev.filter(x => x.id !== id))
    const { error } = await supabase.from(table).update({ deleted_at: ts }).eq('id', id)
    if (error) handleError(error, `Could not delete ${label}`)
  }, [supabase, handleError])

  // Generic archive (move to archived list)
  const archive = useCallback(async (table: string, id: string, fromActive: any[], setActive: any, setArchived: any) => {
    const item = fromActive.find(x => x.id === id)
    if (!item) return
    setActive((prev: any[]) => prev.filter(x => x.id !== id))
    setArchived((prev: any[]) => [{ ...item, archived: true }, ...prev])
    const { error } = await supabase.from(table).update({ archived: true }).eq('id', id)
    if (error) {
      setActive((prev: any[]) => [item, ...prev])
      setArchived((prev: any[]) => prev.filter(x => x.id !== id))
      handleError(error, 'Could not archive')
    }
  }, [supabase, handleError])

  // Generic restore from archive (move back to active)
  const restoreArchived = useCallback(async (table: string, id: string, fromArchived: any[], setActive: any, setArchived: any) => {
    const item = fromArchived.find(x => x.id === id)
    if (!item) return
    setArchived((prev: any[]) => prev.filter(x => x.id !== id))
    setActive((prev: any[]) => [{ ...item, archived: false }, ...prev])
    const { error } = await supabase.from(table).update({ archived: false, deleted_at: null }).eq('id', id)
    if (error) handleError(error, 'Could not restore')
  }, [supabase, handleError])

  // ---------- CONTENT ----------
  const addContent = useCallback(async (input: Partial<ContentPiece>) => {
    const tempId = 'temp-' + Date.now()
    const optimistic: ContentPiece = {
      id: tempId, user_id: userId,
      title: input.title || 'Untitled',
      status: (input.status as ContentStatus) || 'idea',
      platform: (input.platform as any) || 'youtube',
      description: input.description ?? null,
      scheduled_at: input.scheduled_at ?? null,
      due_date: input.due_date ?? null,
      assignee: input.assignee ?? null,
      tags: input.tags ?? [],
    }
    setContent(c => [optimistic, ...c])
    const { data, error } = await supabase.from('content_pieces').insert({
      user_id: userId, title: optimistic.title, description: optimistic.description, status: optimistic.status,
      platform: optimistic.platform, scheduled_at: optimistic.scheduled_at, due_date: optimistic.due_date,
      assignee: optimistic.assignee, tags: optimistic.tags,
    }).select().single()
    if (error) { setContent(c => c.filter(x => x.id !== tempId)); handleError(error, 'Could not create content'); return undefined }
    const newId = (data as any).id as string
    setContent(c => c.map(x => x.id === tempId ? (data as any) : x))
    logActivity('created', (data as any).title)
    notify({ title: 'New content created', message: `“${(data as any).title}” added to ${(data as any).platform}`, type: 'content', link: '/pipeline' })
    return newId
  }, [supabase, userId, logActivity, handleError, notify])

  const updateContent = useCallback(async (id: string, patch: Partial<ContentPiece>) => {
    const before = content
    setContent(c => c.map(x => x.id === id ? { ...x, ...patch } : x))
    const { error } = await supabase.from('content_pieces').update(patch).eq('id', id)
    if (error) { setContent(before); handleError(error, 'Could not update content') }
    else logActivity('updated', patch.title || before.find(x=>x.id===id)?.title || 'a piece')
  }, [supabase, content, logActivity, handleError])

  const removeContent = useCallback(async (id: string) => {
    const item = content.find(x => x.id === id) || archivedContent.find(x => x.id === id)
    await softDelete('content_pieces', id, setContent, setArchivedContent, 'content')
    if (item) logActivity('moved to trash', item.title)
  }, [content, archivedContent, softDelete, logActivity])

  const archiveContent = useCallback(async (id: string) => {
    const item = content.find(x => x.id === id)
    await archive('content_pieces', id, content, setContent, setArchivedContent)
    if (item) notify({ title: 'Content archived', message: `“${item.title}” moved to archive`, type: 'content', link: '/pipeline' })
  }, [archive, content, notify])
  const restoreContent = useCallback(async (id: string) => { await restoreArchived('content_pieces', id, archivedContent, setContent, setArchivedContent) }, [restoreArchived, archivedContent])

  const setStatus = useCallback(async (id: string, status: ContentStatus) => {
    const before = content
    const item = content.find(c => c.id === id)
    if (!item || item.status === status) return
    setContent(c => c.map(x => x.id === id ? { ...x, status } : x))
    const { error } = await supabase.from('content_pieces').update({ status }).eq('id', id)
    if (error) { setContent(before); handleError(error, 'Could not move card') }
    else {
      logActivity('moved', `${item.title} → ${status}`)
      notify({ title: 'Status updated', message: `“${item.title}” is now ${status}`, type: 'content', link: '/pipeline?status=' + status })
    }
  }, [supabase, content, logActivity, handleError, notify])

  // ---------- CREW ----------
  const addCrew = useCallback(async (input: Partial<CrewMember>) => {
    const tempId = 'temp-' + Date.now()
    const optimistic: CrewMember = { id: tempId, user_id: userId, name: input.name || 'New Member', role: input.role || null, status: input.status || 'active', avatar_url: input.avatar_url || null, email: input.email || null }
    setCrew(c => [...c, optimistic])
    const { data, error } = await supabase.from('crew').insert({ user_id: userId, name: optimistic.name, role: optimistic.role, status: optimistic.status, avatar_url: optimistic.avatar_url, email: optimistic.email }).select().single()
    if (error) { setCrew(c => c.filter(x => x.id !== tempId)); handleError(error, 'Could not add crew'); return }
    setCrew(c => c.map(x => x.id === tempId ? (data as any) : x))
    logActivity('added', `${(data as any).name} to the crew`)
  }, [supabase, userId, logActivity, handleError])

  const updateCrew = useCallback(async (id: string, patch: Partial<CrewMember>) => {
    const before = crew
    setCrew(c => c.map(x => x.id === id ? { ...x, ...patch } : x))
    const { error } = await supabase.from('crew').update(patch).eq('id', id)
    if (error) { setCrew(before); handleError(error, 'Could not update crew') }
  }, [supabase, crew, handleError])

  const removeCrew = useCallback(async (id: string) => {
    const item = crew.find(x => x.id === id) || archivedCrew.find(x => x.id === id)
    await softDelete('crew', id, setCrew, setArchivedCrew, 'crew')
    if (item) logActivity('moved to trash', `${item.name}`)
  }, [crew, archivedCrew, softDelete, logActivity])

  const archiveCrew = useCallback(async (id: string) => { await archive('crew', id, crew, setCrew, setArchivedCrew) }, [archive, crew])
  const restoreCrew = useCallback(async (id: string) => { await restoreArchived('crew', id, archivedCrew, setCrew, setArchivedCrew) }, [restoreArchived, archivedCrew])

  // ---------- SHOOTS ----------
  const addShoot = useCallback(async (input: Partial<Shoot>) => {
    const tempId = 'temp-' + Date.now()
    const optimistic: Shoot = { id: tempId, user_id: userId, title: input.title || 'New Shoot', date: input.date || null, start_time: input.start_time || null, end_time: input.end_time || null, location: input.location || null, status: input.status || 'planned', notes: input.notes || null, crew_ids: input.crew_ids || [] }
    setShoots(s => [...s, optimistic])
    const { data, error } = await supabase.from('shoots').insert({ user_id: userId, title: optimistic.title, date: optimistic.date, start_time: optimistic.start_time, end_time: optimistic.end_time, location: optimistic.location, status: optimistic.status, notes: optimistic.notes, crew_ids: optimistic.crew_ids }).select().single()
    if (error) { setShoots(s => s.filter(x => x.id !== tempId)); handleError(error, 'Could not create shoot'); return }
    setShoots(s => s.map(x => x.id === tempId ? (data as any) : x))
    logActivity('scheduled', (data as any).title)
    notify({ title: 'Shoot scheduled', message: `“${(data as any).title}”${(data as any).date ? ` on ${(data as any).date}` : ''}`, type: 'shoot', link: '/shoots' })
  }, [supabase, userId, logActivity, handleError, notify])

  const updateShoot = useCallback(async (id: string, patch: Partial<Shoot>) => {
    const before = shoots
    setShoots(s => s.map(x => x.id === id ? { ...x, ...patch } : x))
    const { error } = await supabase.from('shoots').update(patch).eq('id', id)
    if (error) { setShoots(before); handleError(error, 'Could not update shoot') }
  }, [supabase, shoots, handleError])

  const removeShoot = useCallback(async (id: string) => {
    const item = shoots.find(x => x.id === id) || archivedShoots.find(x => x.id === id)
    await softDelete('shoots', id, setShoots, setArchivedShoots, 'shoot')
    if (item) logActivity('moved to trash', item.title)
  }, [shoots, archivedShoots, softDelete, logActivity])

  const archiveShoot = useCallback(async (id: string) => { await archive('shoots', id, shoots, setShoots, setArchivedShoots) }, [archive, shoots])
  const restoreShoot = useCallback(async (id: string) => { await restoreArchived('shoots', id, archivedShoots, setShoots, setArchivedShoots) }, [restoreArchived, archivedShoots])

  // ---------- MEDIA ----------
  const addMedia = useCallback(async (input: Partial<MediaAsset>) => {
    const tempId = 'temp-' + Date.now()
    const optimistic: MediaAsset = { id: tempId, user_id: userId, title: input.title || 'asset', type: input.type || 'image', url: input.url || null, thumbnail: input.thumbnail || null, size_bytes: input.size_bytes || 0 }
    setMedia(m => [optimistic, ...m])
    const { data, error } = await supabase.from('media').insert({ user_id: userId, title: optimistic.title, type: optimistic.type, url: optimistic.url, thumbnail: optimistic.thumbnail, size_bytes: optimistic.size_bytes }).select().single()
    if (error) { setMedia(m => m.filter(x => x.id !== tempId)); handleError(error, 'Could not add media'); return }
    setMedia(m => m.map(x => x.id === tempId ? (data as any) : x))
    logActivity('uploaded', (data as any).title)
  }, [supabase, userId, logActivity, handleError])

  const removeMedia = useCallback(async (id: string) => {
    const item = media.find(x => x.id === id) || archivedMedia.find(x => x.id === id)
    await softDelete('media', id, setMedia, setArchivedMedia, 'media')
    if (item) logActivity('moved to trash', item.title)
  }, [media, archivedMedia, softDelete, logActivity])

  const archiveMedia = useCallback(async (id: string) => { await archive('media', id, media, setMedia, setArchivedMedia) }, [archive, media])
  const restoreMedia = useCallback(async (id: string) => { await restoreArchived('media', id, archivedMedia, setMedia, setArchivedMedia) }, [restoreArchived, archivedMedia])

  // ---------- WORKSPACE ----------
  const updateWorkspace = useCallback(async (patch: Partial<Workspace>) => {
    const before = workspace
    setWorkspace(w => ({ ...w, ...patch }))
    const { error } = await supabase.from('workspaces').update({ ...patch, updated_at: new Date().toISOString() }).eq('user_id', userId)
    if (error) { setWorkspace(before); handleError(error, 'Could not update settings') }
  }, [supabase, userId, workspace, handleError])

  const restoreDefaults = useCallback(async () => {
    await updateWorkspace({ name: 'My Studio', logo_url: null, theme: 'gold' })
  }, [updateWorkspace])

  // ---------- TRASH ----------
  const loadTrash = useCallback(async (): Promise<TrashItem[]> => {
    const tables: TrashItem['table'][] = ['content_pieces', 'crew', 'shoots', 'media']
    const all: TrashItem[] = []
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*').or('archived.eq.true,deleted_at.not.is.null').order('updated_at', { ascending: false, nullsFirst: false } as any)
      if (data) for (const row of data as any[]) all.push({ id: row.id, title: titleOf(table, row), deleted_at: row.deleted_at || row.updated_at || row.created_at, archived: !!row.archived, table })
    }
    return all.sort((a,b) => (b.deleted_at||'').localeCompare(a.deleted_at||''))
  }, [supabase])

  const restoreFromTrash = useCallback(async (table: TrashItem['table'], id: string) => {
    const { error } = await supabase.from(table).update({ deleted_at: null, archived: false }).eq('id', id)
    if (error) handleError(error, 'Could not restore')
  }, [supabase, handleError])

  const permanentlyDelete = useCallback(async (table: TrashItem['table'], id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) handleError(error, 'Could not permanently delete')
  }, [supabase, handleError])

  const clearTrash = useCallback(async () => {
    const tables: TrashItem['table'][] = ['content_pieces', 'crew', 'shoots', 'media']
    for (const table of tables) {
      await supabase.from(table).delete().eq('user_id', userId).not('deleted_at', 'is', null)
    }
  }, [supabase, userId])

  const value: Store = {
    userId, userName, workspace, loading,
    content, crew, shoots, media, activity,
    archivedContent, archivedCrew, archivedShoots, archivedMedia,
    addContent, updateContent, removeContent, archiveContent, restoreContent, setStatus,
    addCrew, updateCrew, removeCrew, archiveCrew, restoreCrew,
    addShoot, updateShoot, removeShoot, archiveShoot, restoreShoot,
    addMedia, removeMedia, archiveMedia, restoreMedia,
    updateWorkspace, restoreDefaults,
    loadTrash, restoreFromTrash, permanentlyDelete, clearTrash,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
