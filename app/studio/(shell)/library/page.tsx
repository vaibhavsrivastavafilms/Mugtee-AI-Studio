import { redirect } from 'next/navigation'

/** Alias route — Asset OS lives at /studio/assets */
export default function StudioLibraryRedirect() {
  redirect('/studio/assets')
}
