"use client"

import { ScrollableRoleTabs } from './scrollable-role-tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const mockRoles = [
  { id: '1', name: 'Senior Referee', category: 'referee_type' },
  { id: '2', name: 'Junior Referee', category: 'referee_type' },
  { id: '3', name: 'Rookie Referee', category: 'referee_type' },
  { id: '4', name: 'Admin', category: 'admin' },
  { id: '5', name: 'Assignor', category: 'assignor' },
  { id: '6', name: 'League Manager', category: 'league' },
  { id: '7', name: 'Goal Line Technology', category: 'referee_capability' },
  { id: '8', name: 'VAR Operator', category: 'referee_capability' },
  { id: '9', name: 'Fourth Official', category: 'referee_capability' },
  { id: '10', name: 'Fitness Instructor', category: 'training' },
  { id: '11', name: 'Mentor', category: 'training' },
  { id: '12', name: 'Assessment Officer', category: 'training' }
]

export function ScrollableRoleTabsDemo() {
  const handleRoleClick = (role: any) => {
    console.log('Role clicked:', role)
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Scrollable Role Tabs Demo</CardTitle>
          <CardDescription>
            Click and drag to scroll through roles. Works on both mobile and desktop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">All Roles (12 roles)</h3>
            <ScrollableRoleTabs 
              roles={mockRoles}
              onRoleClick={handleRoleClick}
            />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Limited Width Container</h3>
            <div className="max-w-sm border rounded-lg p-3">
              <ScrollableRoleTabs 
                roles={mockRoles.slice(0, 8)}
                onRoleClick={handleRoleClick}
              />
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Few Roles (No scrolling needed)</h3>
            <ScrollableRoleTabs 
              roles={mockRoles.slice(0, 3)}
              onRoleClick={handleRoleClick}
            />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">With Selection</h3>
            <ScrollableRoleTabs 
              roles={mockRoles.slice(0, 6)}
              onRoleClick={handleRoleClick}
              selectedRoleId="2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}