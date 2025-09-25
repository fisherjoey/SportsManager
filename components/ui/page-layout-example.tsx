'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLayout, PageGrid } from '@/components/ui/page-layout'

export function PageLayoutExample() {
  return (
    <PageLayout variant="default" padding="none">
      {/* Example of responsive grid */}
      <PageGrid
        cols={{
          default: 1,
          sm: 2,
          md: 3,
          lg: 4,
          xl: 5,
          '2xl': 6,
          '3xl': 8
        }}
        gap="medium"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>Card {i + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This card adapts to screen size</p>
            </CardContent>
          </Card>
        ))}
      </PageGrid>
    </PageLayout>
  )
}