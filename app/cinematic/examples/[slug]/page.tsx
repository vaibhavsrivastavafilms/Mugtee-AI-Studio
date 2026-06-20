import { ShowcaseExampleView } from '@/components/showcase/example-case-study'
import { getShowcaseSlugs } from '@/lib/showcase/examples'

export function generateStaticParams() {
  return getShowcaseSlugs().map((slug) => ({ slug }))
}

export default async function ShowcaseExamplePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <ShowcaseExampleView slug={slug} />
}
