'use client'

import { CloudflareSidebar } from '@/components/cloudflare-sidebar'

export default function CloudflareDemo() {
  return (
    <div className="flex h-screen bg-white">
      {/* Cloudflare Sidebar */}
      <CloudflareSidebar />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Documentation
              </button>
              <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Support
              </button>
              <div className="h-8 w-8 rounded-full bg-orange-500"></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Cloudflare</h2>
            <p className="text-gray-600">
              This is a demo of the Cloudflare-inspired UI theme with exact color matching.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Total Requests</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">+12%</span>
              </div>
              <div className="text-3xl font-semibold text-gray-900">1.2M</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Bandwidth Used</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Beta</span>
              </div>
              <div className="text-3xl font-semibold text-gray-900">842 GB</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Active Zones</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">New</span>
              </div>
              <div className="text-3xl font-semibold text-gray-900">24</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-orange-500 text-white font-medium rounded hover:bg-orange-600 transition-colors">
              Primary Action
            </button>
            <button className="px-6 py-3 bg-white text-gray-700 font-medium rounded border border-gray-300 hover:bg-gray-50 transition-colors">
              Secondary Action
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}