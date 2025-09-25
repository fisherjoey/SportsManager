'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  FileText,
  BarChart3,
  Shield,
  Activity,
  Wifi,
  Target,
  Scale,
  MapPin,
  Cloud,
  Code,
  Lock
} from 'lucide-react'

interface NavItem {
  title: string
  href?: string
  icon?: React.ReactNode
  badge?: string
  isExpandable?: boolean
  isExpanded?: boolean
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: 'Log Explorer',
    href: '/logs',
    icon: <FileText className="w-4 h-4" />,
    isExpandable: true,
    isExpanded: false
  },
  {
    title: 'Analytics & logs',
    href: '/analytics',
    icon: <BarChart3 className="w-4 h-4" />,
    isExpandable: true,
    isExpanded: false
  },
  {
    title: 'Security Center',
    href: '/security',
    icon: <Shield className="w-4 h-4" />,
    isExpandable: true,
    isExpanded: false
  },
  {
    title: 'Trace',
    href: '/trace',
    icon: <Activity className="w-4 h-4" />,
    badge: 'Beta',
    isExpandable: false
  },
  {
    title: 'WAF',
    href: '/waf',
    icon: <Wifi className="w-4 h-4" />,
    isExpandable: false
  },
  {
    title: 'Turnstile',
    href: '/turnstile',
    icon: <Target className="w-4 h-4" />,
    isExpandable: false
  },
  {
    title: 'Load balancing',
    href: '/load-balancing',
    icon: <Scale className="w-4 h-4" />,
    isExpandable: false
  },
  {
    title: 'IP addresses',
    href: '/ip-addresses',
    icon: <MapPin className="w-4 h-4" />,
    isExpandable: true,
    isExpanded: false
  },
  {
    title: 'Zero Trust',
    href: '/zero-trust',
    icon: <Cloud className="w-4 h-4" />,
    isExpandable: false
  },
  {
    title: 'Compute (Workers)',
    href: '/workers',
    icon: <Code className="w-4 h-4" />,
    isExpandable: true,
    isExpanded: false
  },
  {
    title: 'Secrets Store',
    href: '/secrets',
    icon: <Lock className="w-4 h-4" />,
    badge: 'New',
    isExpandable: false
  }
]

export function CloudflareSidebar() {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())

  const toggleExpand = (title: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(title)) {
      newExpanded.delete(title)
    } else {
      newExpanded.add(title)
    }
    setExpandedItems(newExpanded)
  }

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Sidebar content */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <div key={item.title}>
            <Link
              href={item.href || '#'}
              className={cn(
                "flex items-center justify-between px-4 py-2.5 text-sm font-normal",
                "text-gray-700 hover:bg-gray-50 transition-colors duration-150",
                "group relative"
              )}
              onClick={(e) => {
                if (item.isExpandable) {
                  e.preventDefault()
                  toggleExpand(item.title)
                }
              }}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <span className="text-gray-500 group-hover:text-gray-700">
                  {item.icon}
                </span>

                {/* Title */}
                <span className="text-gray-900">{item.title}</span>

                {/* Badge */}
                {item.badge && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded",
                      item.badge === 'Beta'
                        ? "bg-orange-100 text-orange-700 border border-orange-200"
                        : "bg-blue-100 text-blue-700 border border-blue-200"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Expandable indicator */}
              {item.isExpandable && (
                <span className="text-gray-400">
                  {expandedItems.has(item.title) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </span>
              )}
            </Link>

            {/* Expanded content placeholder */}
            {item.isExpandable && expandedItems.has(item.title) && (
              <div className="bg-gray-50 py-1">
                <div className="pl-11 pr-4 py-2 text-sm text-gray-600">
                  {/* Placeholder for nested items */}
                  <div className="space-y-1">
                    <div className="py-1.5 hover:text-gray-900 cursor-pointer">Overview</div>
                    <div className="py-1.5 hover:text-gray-900 cursor-pointer">Settings</div>
                    <div className="py-1.5 hover:text-gray-900 cursor-pointer">Analytics</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  )
}