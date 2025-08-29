import { notFound } from 'next/navigation'
import { ResourceRenderer } from '@/components/resource-centre'

export default async function ResourceDocPage({
  params,
}: {
  params: { slug: string[] }
}) {
  const slug = params.slug?.join('/') || ''

  try {
    return <ResourceRenderer slug={slug} />
  } catch (error) {
    notFound()
  }
}
