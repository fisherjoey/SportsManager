import { notFound } from 'next/navigation'
import { ResourceRenderer } from '@/components/resource-centre'

export default async function ResourceDocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug: slugArray } = await params
  const slug = slugArray?.join('/') || ''

  return <ResourceRenderer slug={slug} />
}
