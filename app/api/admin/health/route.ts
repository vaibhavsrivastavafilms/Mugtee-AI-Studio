import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin/is-admin'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: exportJobs } = await supabase
    .from('export_jobs')
    .select('id, status, progress, error, created_at, updated_at, metadata')
    .order('updated_at', { ascending: false })
    .limit(25)

  const { data: genJobs } = await supabase
    .from('generation_jobs')
    .select('id, status, progress, error, current_step, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(25)

  const exports = exportJobs ?? []
  const generations = genJobs ?? []

  const exportCompleted = exports.filter((j) => j.status === 'completed').length
  const exportFailed = exports.filter((j) => j.status === 'failed').length
  const genActive = generations.filter((j) =>
    ['queued', 'running', 'paused'].includes(j.status)
  ).length
  const genFailed = generations.filter((j) => j.status === 'failed').length

  const exportDurations = exports
    .filter((j) => j.status === 'completed' && j.created_at && j.updated_at)
    .map((j) => new Date(j.updated_at).getTime() - new Date(j.created_at).getTime())
    .filter((ms) => ms > 0)

  const avgExportMs =
    exportDurations.length > 0
      ? Math.round(exportDurations.reduce((a, b) => a + b, 0) / exportDurations.length)
      : null

  const genDurations = generations
    .filter((j) => j.status === 'completed' && j.created_at && j.updated_at)
    .map((j) => new Date(j.updated_at).getTime() - new Date(j.created_at).getTime())
    .filter((ms) => ms > 0)

  const avgGenerationMs =
    genDurations.length > 0
      ? Math.round(genDurations.reduce((a, b) => a + b, 0) / genDurations.length)
      : null

  const exportSuccessRate =
    exports.length > 0 ? Math.round((exportCompleted / exports.length) * 100) : null

  return NextResponse.json({
    generationJobs: {
      total: generations.length,
      active: genActive,
      failed: genFailed,
      recent: generations.slice(0, 10),
    },
    exportJobs: {
      total: exports.length,
      completed: exportCompleted,
      failed: exportFailed,
      successRate: exportSuccessRate,
      avgDurationMs: avgExportMs,
      recent: exports.slice(0, 10),
    },
    generationHealth: {
      storyboardSuccess: generations.filter((j) => j.current_step === 'images' && j.status === 'completed').length,
      voiceSuccess: generations.filter((j) => j.current_step === 'voice' && j.status === 'completed').length,
      exportSuccess: exportCompleted,
      avgGenerationMs,
    },
    storageUsage: null,
  })
}
