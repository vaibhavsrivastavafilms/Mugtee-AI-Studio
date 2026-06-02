/** When true, show email/password recovery (Supabase email provider must be enabled). */
export function isEmailAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SUPABASE_EMAIL_AUTH === 'true'
}
