'use client'
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef, useMemo } from 'react'
import { createSupabaseBrowserClient } from './supabase/client'
import { seedDemoData } from './seed'
import { toast } from 'sonner'
import type { ContentPiece, CrewMember, Shoot, MediaAsset, ActivityItem, ContentStatus } from './types'

interface Loading {
  content: boolean
  crew: boolean
  shoots: boolean
  media: boolean
  activity: boolean
  initial: boolean
}

interface Store {
  userId: string
  userName: string
  loading: Loading

  content: ContentPiece[]
  crew: CrewMember[]
  shoots: Shoot[]
  media: MediaAsset[]
  activity: ActivityItem[]

  // Content
  addContent: (input: Partial<ContentPiece>) => Promise<void>
  updateContent: (id: string, patch: Partial<ContentPiece>) => Promise<void>
  removeContent: (id: string) => Promise<void>
  setStatus: (id: string, status: ContentStatus) => Promise<void>

  // Crew
  addCrew: (input: Partial<CrewMember>) => Promise<void>
  updateCrew: (id: string, patch: Partial<CrewMember>) => Promise<void>
  removeCrew: (id: string) => Promise<void>

  // Shoots
  addShoot: (input: Partial<Shoot>) => Promise<void>
  updateShoot: (id: string, patch: Partial<Shoot>) => Promise<void>
  removeShoot: (id: string) => Promise<void>

  // Media
  addMedia: (input: Partial<MediaAsset>) => Promise<void>
  removeMedia: (id: string) => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ userId, userName, children }: { userId: string; userName: string; children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [content, setContent] = useState<ContentPiece[]>([])
  const [crew, setCrew]       = useState<CrewMember[]>([])
  const [shoots, setShoots]   = useState<Shoot[]>([])
  const [media, setMedia]     = useState<MediaAsset[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState<Loading>({ content: true, crew: true, shoots: true, media: true, activity: true, initial: true })
  const seededRef = useRef(false)

  // ---------- helpers ----------
  const logActivity = useCallback(async (action: string, target: string) => {
    try {
      await supabase.from('team_activity').insert({ user_id: userId, actor: userName, action, target })
    } catch (e) { console.error('logActivity', e) }
  }, [supabase, userId, userName])

  const handleError = useCallback((e: any, fallback: string) => {
    console.error(e)
    toast.error(e?.message || fallback)
  }, [])

  // ---------- initial load ----------
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [c, cr, sh, md, ac] = await Promise.all([
          supabase.from('content_pieces').select('*').order('created_at', { ascending: false }),
          supabase.from('crew').select('*').order('created_at', { ascending: true }),
          supabase.from('shoots').select('*').order('date', { ascending: true }),
          supabase.from('media').select('*').order('created_at', { ascending: false }),
          supabase.from('team_activity').select('*').order('created_at', { ascending: false }).limit(30),
        ])
        if (cancelled) return
        const allEmpty = !c.data?.length && !cr.data?.length && !sh.data?.length && !md.data?.length
        if (allEmpty && !seededRef.current) {
          seededRef.current = true
          await seedDemoData(supabase, userId)
          const [c2, cr2, sh2, md2, ac2] = await Promise.all([
            supabase.from('content_pieces').select('*').order('created_at', { ascending: false }),
            supabase.from('crew').select('*').order('created_at', { ascending: true }),
            supabase.from('shoots').select('*').order('date', { ascending: true }),
            supabase.from('media').select('*').order('created_at', { ascending: false }),
            supabase.from('team_activity').select('*').order('created_at', { ascending: false }).limit(30),
          ])
          if (cancelled) return
          setContent((c2.data as any) || [])
          setCrew((cr2.data as any) || [])
          setShoots((sh2.data as any) || [])
          setMedia((md2.data as any) || [])
          setActivity((ac2.data as any) || [])
        } else {
          setContent((c.data as any) || [])
          setCrew((cr.data as any) || [])
          setShoots((sh.data as any) || [])
          setMedia((md.data as any) || [])
          setActivity((ac.data as any) || [])
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
    const handlers = [
      { table: 'content_pieces',  set: setContent },
      { table: 'crew',           set: setCrew },
      { table: 'shoots',         set: setShoots },
      { table: 'media',          set: setMedia },
      { table: 'team_activity',  set: setActivity },
    ] as const

    const channels = handlers.map(({ table, set }) => {
      return supabase
        .channel(`rt-${table}-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter }, (payload: any) => {
          const row = (payload.new || payload.old) as any
          if (!row) return
          if (payload.eventType === 'INSERT') {
            ;(set as any)((prev: any[]) => prev.find(x => x.id === row.id) ? prev : [row, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            ;(set as any)((prev: any[]) => prev.map(x => x.id === row.id ? row : x))
          } else if (payload.eventType === 'DELETE') {
            ;(set as any)((prev: any[]) => prev.filter(x => x.id !== row.id))
          }
        })
        .subscribe()
    })
    return () => { channels.forEach(c => supabase.removeChannel(c)) }
  }, [supabase, userId])

  // ---------- CONTENT crud ----------
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
      user_id: userId,
      title: optimistic.title,
      description: optimistic.description,
      status: optimistic.status,
      platform: optimistic.platform,
      scheduled_at: optimistic.scheduled_at,
      due_date: optimistic.due_date,
      assignee: optimistic.assignee,
      tags: optimistic.tags,
    }).select().single()
    if (error) {
      setContent(c => c.filter(x => x.id !== tempId))
      handleError(error, 'Could not create content')
      return
    }
    setContent(c => c.map(x => x.id === tempId ? (data as any) : x))
    logActivity('created', (data as any).title)
  }, [supabase, userId, logActivity, handleError])

  const updateContent = useCallback(async (id: string, patch: Partial<ContentPiece>) => {
    const before = content
    setContent(c => c.map(x => x.id === id ? { ...x, ...patch } : x))
    const { error } = await supabase.from('content_pieces').update(patch).eq('id', id)
    if (error) { setContent(before); handleError(error, 'Could not update content') }
    else logActivity('updated', patch.title || before.find(x=>x.id===id)?.title || 'a piece')
  }, [supabase, content, logActivity, handleError])

  const removeContent = useCallback(async (id: string) => {
    const before = content
    const item = content.find(x => x.id === id)
    setContent(c => c.filter(x => x.id !== id))
    const { error } = await supabase.from('content_pieces').delete().eq('id', id)
    if (error) { setContent(before); handleError(error, 'Could not delete content') }
    else if (item) logActivity('deleted', item.title)
  }, [supabase, content, logActivity, handleError])

  const setStatus = useCallback(async (id: string, status: ContentStatus) => {
    const before = content
    const item = content.find(c => c.id === id)
    if (!item || item.status === status) return
    setContent(c => c.map(x => x.id === id ? { ...x, status } : x))
    const { error } = await supabase.from('content_pieces').update({ status }).eq('id', id)
    if (error) { setContent(before); handleError(error, 'Could not move card') }
    else logActivity('moved', `${item.title} → ${status}`)
  }, [supabase, content, logActivity, handleError])

  // ---------- CREW crud ----------
  const addCrew = useCallback(async (input: Partial<CrewMember>) => {
    const tempId = 'temp-' + Date.now()
    const optimistic: CrewMember = { id: tempId, user_id: userId, name: input.name || 'New Member', role: input.role || null, status: input.status || 'active', avatar_url: input.avatar_url || null, email: input.email || null }
    setCrew(c => [...c, optimistic])
    const { data, error } = await supabase.from('crew').insert({
      user_id: userId, name: optimistic.name, role: optimistic.role, status: optimistic.status, avatar_url: optimistic.avatar_url, email: optimistic.email,
    }).select().single()
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
    const before = crew
    const item = crew.find(x => x.id === id)
    setCrew(c => c.filter(x => x.id !== id))
    const { error } = await supabase.from('crew').delete().eq('id', id)
    if (error) { setCrew(before); handleError(error, 'Could not remove crew') }
    else if (item) logActivity('removed', `${item.name} from crew`)
  }, [supabase, crew, logActivity, handleError])

  // ---------- SHOOTS crud ----------
  const addShoot = useCallback(async (input: Partial<Shoot>) => {
    const tempId = 'temp-' + Date.now()
    const optimistic: Shoot = { id: tempId, user_id: userId, title: input.title || 'New Shoot', date: input.date || null, start_time: input.start_time || null, end_time: input.end_time || null, location: input.location || null, status: input.status || 'planned', notes: input.notes || null, crew_ids: input.crew_ids || [] }
    setShoots(s => [...s, optimistic])
    const { data, error } = await supabase.from('shoots').insert({
      user_id: userId, title: optimistic.title, date: optimistic.date, start_time: optimistic.start_time, end_time: optimistic.end_time, location: optimistic.location, status: optimistic.status, notes: optimistic.notes, crew_ids: optimistic.crew_ids,
    }).select().single()
    if (error) { setShoots(s => s.filter(x => x.id !== tempId)); handleError(error, 'Could not create shoot'); return }
    setShoots(s => s.map(x => x.id === tempId ? (data as any) : x))
    logActivity('scheduled', (data as any).title)
  }, [supabase, userId, logActivity, handleError])

  const updateShoot = useCallback(async (id: string, patch: Partial<Shoot>) => {
    const before = shoots
    setShoots(s => s.map(x => x.id === id ? { ...x, ...patch } : x))
    const { error } = await supabase.from('shoots').update(patch).eq('id', id)
    if (error) { setShoots(before); handleError(error, 'Could not update shoot') }
  }, [supabase, shoots, handleError])

  const removeShoot = useCallback(async (id: string) => {
    const before = shoots
    const item = shoots.find(x => x.id === id)
    setShoots(s => s.filter(x => x.id !== id))
    const { error } = await supabase.from('shoots').delete().eq('id', id)
    if (error) { setShoots(before); handleError(error, 'Could not remove shoot') }
    else if (item) logActivity('cancelled', item.title)
  }, [supabase, shoots, logActivity, handleError])

  // ---------- MEDIA crud ----------
  const addMedia = useCallback(async (input: Partial<MediaAsset>) => {
    const tempId = 'temp-' + Date.now()
    const optimistic: MediaAsset = { id: tempId, user_id: userId, title: input.title || 'asset', type: input.type || 'image', url: input.url || null, thumbnail: input.thumbnail || null, size_bytes: input.size_bytes || 0 }
    setMedia(m => [optimistic, ...m])
    const { data, error } = await supabase.from('media').insert({
      user_id: userId, title: optimistic.title, type: optimistic.type, url: optimistic.url, thumbnail: optimistic.thumbnail, size_bytes: optimistic.size_bytes,
    }).select().single()
    if (error) { setMedia(m => m.filter(x => x.id !== tempId)); handleError(error, 'Could not add media'); return }
    setMedia(m => m.map(x => x.id === tempId ? (data as any) : x))
    logActivity('uploaded', (data as any).title)
  }, [supabase, userId, logActivity, handleError])

  const removeMedia = useCallback(async (id: string) => {
    const before = media
    const item = media.find(x => x.id === id)
    setMedia(m => m.filter(x => x.id !== id))
    const { error } = await supabase.from('media').delete().eq('id', id)
    if (error) { setMedia(before); handleError(error, 'Could not remove media') }
    else if (item) logActivity('removed', item.title)
  }, [supabase, media, logActivity, handleError])

  const value: Store = {
    userId, userName, loading,
    content, crew, shoots, media, activity,
    addContent, updateContent, removeContent, setStatus,
    addCrew, updateCrew, removeCrew,
    addShoot, updateShoot, removeShoot,
    addMedia, removeMedia,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
