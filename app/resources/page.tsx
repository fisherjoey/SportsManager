import { ResourceCentre } from '@/components/resource-centre'
import { getAllResources, getResourceCategories } from '@/lib/resources'

export default function ResourcesPage() {
  const resources = getAllResources()
  const categories = getResourceCategories()
  
  return <ResourceCentre resources={resources} categories={categories} />
}

export const metadata = {
  title: 'Resource Centre - Sports Management',
  description: 'Access important documents, training materials, and resources for referees and administrators.',
}
