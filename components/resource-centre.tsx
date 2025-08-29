'use client'

import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getResourceBySlug } from '@/lib/resources'
import { remark } from 'remark'
import remarkHtml from 'remark-html'

interface ResourceRendererProps {
  slug: string
}


interface ResourceCentreProps {
  resources?: any[]
  categories?: string[]
}

export function ResourceCentre({ resources = [], categories = [] }: ResourceCentreProps) {
  // Simple grid view of available resources matching CBOA structure
  const resourceCategories = [
    {
      title: 'General Information',
      description: 'Meeting schedules, announcements, and organizational updates',
      items: [
        { name: 'General Meetings', slug: 'general-meetings', description: 'Meeting minutes and agendas' },
        { name: 'Rules Modifications', slug: 'rules-modifications', description: 'Game rule updates and modifications' }
      ]
    },
    {
      title: 'Referee Resources', 
      description: 'Training materials, assessment tools, and development resources',
      items: [
        { name: 'Referee Development', slug: 'referee-development', description: 'Training programs and skill development' },
        { name: 'Performance Assessment', slug: 'performance-assessment', description: 'Evaluation criteria and feedback tools' },
        { name: 'CBOA Library', slug: 'cboa-library', description: 'Reference materials and documentation' }
      ]
    },
    {
      title: 'Member Services',
      description: 'Tools and resources for active members',
      items: [
        { name: 'Member Services', slug: 'member-services', description: 'Benefits, support, and member resources' },
        { name: 'Self Assign', slug: 'self-assign', description: 'Game assignment tools and procedures' }
      ]
    }
  ]

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          CBOA Resource Centre
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Calgary Basketball Officials Association - Resources and Information for Active Members
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {resourceCategories.map((category) => (
          <Card key={category.title} className="h-fit">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-2">{category.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{category.description}</p>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/resources/${item.slug}`}
                    className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
          <strong>Note:</strong> This site and its contents are exclusively for the use of active CBOA members.
        </p>
      </div>
    </div>
  )
}

export function ResourceRenderer({ slug }: ResourceRendererProps) {
  const resource = getResourceBySlug(slug)

  if (!resource || !resource.content) {
    notFound()
  }

  // Convert markdown to HTML
  const processedContent = remark()
    .use(remarkHtml)
    .processSync(resource.content)
    .toString()

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link 
          href="/resources" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Resource Centre
        </Link>
        
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">{resource.category}</Badge>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {resource.lastUpdated}
          </span>
          {resource.isNew && (
            <Badge variant="destructive" className="text-xs">New</Badge>
          )}
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {resource.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {resource.description}
        </p>
      </div>

      {/* Content */}
      <div className="max-w-none">
        <Card>
          <CardContent className="pt-6">
            <div 
              className="prose prose-gray dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        {resource.downloadUrl && (
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <a href={resource.downloadUrl} download>
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
        )}
        {resource.url && (
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              External Link
            </a>
          </Button>
        )}
        <Button variant="outline" className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Share Resource
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Subscribe to Updates
        </Button>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          <strong>Note:</strong> This content is exclusively for the use of active CBOA members.
        </p>
      </footer>
    </div>
  )
}
