import { redirect } from 'next/navigation'
import { STUDIO } from '@/lib/create/routes'

export default function CreateKnowledgeRedirect() {
  redirect(STUDIO.knowledge)
}
