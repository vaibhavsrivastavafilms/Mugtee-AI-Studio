import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

loadEnvLocal()
const OWNER = 'a8ca8ec0-b817-4b9d-ab44-03a3b225744c'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const email = process.env.E2E_EMAIL?.trim()
const { data: owner } = await supabase.auth.admin.getUserById(OWNER)
const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
const e2e = (list.users ?? []).find((u) => u.email && email && u.email.toLowerCase() === email.toLowerCase())
console.log(JSON.stringify({
  ownerId: OWNER,
  ownerEmailPresent: Boolean(owner.user?.email),
  e2eUserId: e2e?.id ?? null,
  e2eMatchesOwner: e2e?.id === OWNER,
}, null, 2))
