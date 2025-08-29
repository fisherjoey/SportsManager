import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Calendar, Download, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

import { getResourceBySlug, getAllResources } from '@/lib/resources'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ResourcePageProps {
  params: {
    slug: string
  }
}

export default function ResourcePage({ params }: ResourcePageProps) {
  const resource = getResourceBySlug(params.slug)

  if (!resource) {
    notFound()
  }

  const handleDownload = () => {
    if (resource.downloadUrl) {
      // In a real app, this would trigger a download
      console.log(`Downloading: ${resource.downloadUrl}`)
      // window.open(resource.downloadUrl, '_blank')
    }
  }

  const handleExternalLink = () => {
    if (resource.url) {
      // In a real app, this would navigate to external URL
      console.log(`Opening: ${resource.url}`)
      // window.open(resource.url, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href="/resources">
            <Button variant="ghost" className="pl-0">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Resource Centre
            </Button>
          </Link>
        </div>

        {/* Resource Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="secondary">
                  {resource.category}
                </Badge>
                {resource.isNew && (
                  <Badge variant="destructive">
                    New
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {resource.title}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {resource.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 ml-4">
              {resource.downloadUrl && (
                <Button onClick={handleDownload} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
              {resource.url && (
                <Button onClick={handleExternalLink} variant="outline" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Last updated: {resource.lastUpdated}</span>
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-6">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>,
                  p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                }}
              >
                {resource.content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Related Resources */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Related Resources</h2>
          <div className="text-sm text-gray-500">
            <Link href="/resources">
              <Button variant="outline">
                View all resources in {resource.category}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Generate static params for all resources
export async function generateStaticParams() {
  const resources = getAllResources()
  
  return resources.map((resource) => ({
    slug: resource.slug,
  }))
}

// Generate metadata for each resource
export async function generateMetadata({ params }: ResourcePageProps) {
  const resource = getResourceBySlug(params.slug)

  if (!resource) {
    return {
      title: 'Resource Not Found',
    }
  }

  return {
    title: `${resource.title} - Resource Centre`,
    description: resource.description,
  }
}