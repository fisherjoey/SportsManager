import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Basic health check
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'sports-management-frontend',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'sports-management-frontend',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}