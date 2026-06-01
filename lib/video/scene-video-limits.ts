import fs from 'fs'
import os from 'os'
import path from 'path'
import { trackUsageMetric } from '@/lib/usage/api-guards'

export type SceneVideoUsageSnapshot = {
  dailyUsed: number
  monthlyUsed: number
  dailyLimit: number
  monthlyLimit: number
  allowed: boolean
}

type VideoUsageLedger = {
  daily?: { date: string; count: number }
  monthly?: { month: string; count: number }
  total?: number
}

const LEDGER_DIR = path.join(os.tmpdir(), 'mugtee-scene-video-usage')
const memLedgers = new Map<string, VideoUsageLedger>()

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

function parseDailyLimit(): number {
  const raw = process.env.MUGTEE_LIMIT_DAILY_VIDEOS ?? process.env.daily_video_limit
  const n = Number.parseInt(String(raw ?? '10'), 10)
  return Number.isFinite(n) && n >= 0 ? n : 10
}

function parseMonthlyLimit(): number {
  const raw = process.env.MUGTEE_LIMIT_MONTHLY_VIDEOS ?? process.env.monthly_video_limit
  const n = Number.parseInt(String(raw ?? '50'), 10)
  return Number.isFinite(n) && n >= 0 ? n : 50
}

function ledgerPath(userId: string): string {
  return path.join(LEDGER_DIR, `${userId.replace(/[^a-zA-Z0-9_-]/g, '')}.json`)
}

function readLedger(userId: string): VideoUsageLedger {
  const mem = memLedgers.get(userId)
  if (mem) return mem
  try {
    const raw = fs.readFileSync(ledgerPath(userId), 'utf8')
    const parsed = JSON.parse(raw) as VideoUsageLedger
    memLedgers.set(userId, parsed)
    return parsed
  } catch {
    return {}
  }
}

function writeLedger(userId: string, ledger: VideoUsageLedger) {
  memLedgers.set(userId, ledger)
  try {
    fs.mkdirSync(LEDGER_DIR, { recursive: true })
    fs.writeFileSync(ledgerPath(userId), JSON.stringify(ledger), 'utf8')
  } catch {
    /* best-effort */
  }
}

function normalizeLedger(ledger: VideoUsageLedger): VideoUsageLedger {
  const day = todayKey()
  const month = monthKey()
  return {
    ...ledger,
    daily: ledger.daily?.date === day ? ledger.daily : { date: day, count: 0 },
    monthly: ledger.monthly?.month === month ? ledger.monthly : { month, count: 0 },
  }
}

export async function checkSceneVideoLimit(userId: string): Promise<SceneVideoUsageSnapshot> {
  const dailyLimit = parseDailyLimit()
  const monthlyLimit = parseMonthlyLimit()
  const ledger = normalizeLedger(readLedger(userId))
  const dailyUsed = ledger.daily?.count ?? 0
  const monthlyUsed = ledger.monthly?.count ?? 0

  if (process.env.MUGTEE_LIMITS_ENABLED === 'false') {
    return { dailyUsed, monthlyUsed, dailyLimit, monthlyLimit, allowed: true }
  }

  return {
    dailyUsed,
    monthlyUsed,
    dailyLimit,
    monthlyLimit,
    allowed: dailyUsed < dailyLimit && monthlyUsed < monthlyLimit,
  }
}

export async function trackSceneVideoUsage(userId: string, amount = 1): Promise<void> {
  if (amount <= 0) return
  const ledger = normalizeLedger(readLedger(userId))
  const next: VideoUsageLedger = {
    ...ledger,
    daily: { date: todayKey(), count: (ledger.daily?.count ?? 0) + amount },
    monthly: { month: monthKey(), count: (ledger.monthly?.count ?? 0) + amount },
    total: (ledger.total ?? 0) + amount,
  }
  writeLedger(userId, next)
  await trackUsageMetric(userId, 'generations')
}

export function buildSceneVideoLimitError(snapshot: SceneVideoUsageSnapshot) {
  const hitDaily = snapshot.dailyUsed >= snapshot.dailyLimit
  return {
    error: hitDaily
      ? 'Daily scene video limit reached.'
      : 'Monthly scene video limit reached.',
    code: 'scene_video_limit',
    dailyUsed: snapshot.dailyUsed,
    dailyLimit: snapshot.dailyLimit,
    monthlyUsed: snapshot.monthlyUsed,
    monthlyLimit: snapshot.monthlyLimit,
  }
}
