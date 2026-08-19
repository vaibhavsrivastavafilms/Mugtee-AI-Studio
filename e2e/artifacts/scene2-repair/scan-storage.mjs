import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('missing supabase env')

const supabase = createClient(url, key, { auth: { persistSession: false } })
const prod = '606f4edd-5557-4285-af9c-0b6cb7014493'
const user = '0ebf33ae-5f4a-4c70-b084-8afd6df53df4'
const scene2 = '9c2668ec-563d-4360-99a5-a4c90cf4b842'

const prefixes = [
  `${user}/v7/${prod}/scenes/${scene2}`,
  `${user}/v7/${prod}/scenes`,
]

const results = []
for (const prefix of prefixes) {
  const { data, error } = await supabase.storage.from('project-assets').list(prefix, {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  })
  results.push({
    prefix,
    error: error?.message ?? null,
    count: data?.length ?? 0,
    items: (data ?? []).map((x) => ({ name: x.name, id: x.id, metadata: x.metadata })),
  })
}

// Also check if specific files exist
const candidatePaths = [
  `${user}/v7/${prod}/scenes/${scene2}/v1_a1.png`,
  `${user}/v7/${prod}/scenes/${scene2}/video_a1.mp4`,
]
const existsChecks = []
for (const p of candidatePaths) {
  const { data, error } = await supabase.storage.from('project-assets').download(p)
  existsChecks.push({
    path: p,
    exists: !error && data != null,
    size: data?.size ?? 0,
    error: error?.message ?? null,
  })
}

const out = { prod, scene2, results, existsChecks }
fs.writeFileSync(path.join(__dirname, 'storage-scan.json'), JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
