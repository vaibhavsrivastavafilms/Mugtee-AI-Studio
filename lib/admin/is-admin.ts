/** Admin gate for creator validation dashboard and metrics API. */
export function isAdminUser(user: { id: string; email?: string | null } | null | undefined): boolean {
  if (!user?.id) return false

  const ids = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (ids.includes(user.id)) return true

  const email = (user.email || '').trim().toLowerCase()
  if (!email) return false

  const emails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  return emails.includes(email)
}
