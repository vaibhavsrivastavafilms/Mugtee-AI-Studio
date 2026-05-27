import { ShowcaseExampleView } from '@/components/showcase/example-case-study'
import { getShowcaseSlugs } from '@/lib/showcase/examples'

export function generateStaticParams() {
  return getShowcaseSlugs().map((slug) => ({ slug }))
}

export default function ShowcaseExamplePage({
  params,
}: {
  params: { slug: string }
}) {
  return <ShowcaseExampleView slug={params.slug} />
}
