import { redirect } from 'next/navigation'
import { quickCutStudioHref } from '@/lib/create/routes'

export default function StudioIndexPage() {
  redirect(quickCutStudioHref())
}
