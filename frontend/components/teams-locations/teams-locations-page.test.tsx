import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TeamsLocationsPage } from './teams-locations-page'

// Mock the API hook
const mockGetTeams = jest.fn()
const mockCreateTeam = jest.fn()
jest.mock('@/lib/api', () => ({
  useApi: () => ({
    getTeams: mockGetTeams,
    createTeam: mockCreateTeam
  })
}))

// Mock the toast hook
const mockToast = jest.fn()
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}))

// Mock the dialog components
jest.mock('./create-team-dialog', () => ({
  CreateTeamDialog: ({ open, onCreateTeam }: any) => (
    <div data-testid="create-team-dialog">
      {open && (
        <button
          onClick={() => onCreateTeam({
            name: 'Test Team',
            division: 'U12',
            location: 'Calgary',
            contactName: 'John Doe',
            contactEmail: 'john@test.com',
            contactPhone: '403-555-0123',
            homeVenue: 'Test Arena',
            colors: { primary: '#000000', secondary: '#FFFFFF' }
          })}
          data-testid="submit-team"
        >
          Submit Team
        </button>
      )}
    </div>
  )
}))

jest.mock('./create-location-dialog', () => ({
  CreateLocationDialog: ({ open }: any) => (
    <div data-testid="create-location-dialog">
      {open && <div>Create Location Dialog</div>}
    </div>
  )
}))

jest.mock('./team-details-dialog', () => ({
  TeamDetailsDialog: ({ open, team }: any) => (
    <div data-testid="team-details-dialog">
      {open && team && <div>Team Details: {team.name}</div>}
    </div>
  )
}))

jest.mock('./location-details-dialog', () => ({
  LocationDetailsDialog: ({ open }: any) => (
    <div data-testid="location-details-dialog">
      {open && <div>Location Details</div>}
    </div>
  )
}))

const mockTeamsData = {
  data: {
    teams: [
      {
        id: '1',
        name: 'Calgary Flames',
        age_group: 'U12',
        location: 'Calgary NW',
        contact_name: 'John Doe',
        contact_email: 'john@test.com',
        contact_phone: '403-555-0123',
        home_venue: 'Saddledome',
        founded_year: 2020,
        website: 'https://flames.com',
        colors: { primary: '#FF0000', secondary: '#FFFFFF' },
        notes: 'Test notes',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      },
      {
        id: '2',
        name: 'Edmonton Oilers',
        age_group: 'U14',
        location: 'Edmonton',
        contact_name: 'Jane Smith',
        contact_email: 'jane@test.com',
        contact_phone: '780-555-0123',
        home_venue: 'Rogers Place',
        is_active: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
    ]
  }
}

describe('TeamsLocationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetTeams.mockResolvedValue(mockTeamsData)
  })

  it('renders the page title and description', () => {
    render(<TeamsLocationsPage />)
    
    expect(screen.getByText('Teams & Locations')).toBeInTheDocument()
    expect(screen.getByText('Manage teams, venues, and facility information')).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    mockGetTeams.mockImplementation(() => new Promise(() => {})) // Never resolves
    render(<TeamsLocationsPage />)
    
    expect(screen.getByText('Loading teams and locations...')).toBeInTheDocument()
  })

  it('loads and displays teams data', async () => {
    render(<TeamsLocationsPage />)
    
    await waitFor(() => {
      expect(mockGetTeams).toHaveBeenCalled()
    })

    expect(screen.getByText('Calgary Flames')).toBeInTheDocument()
    expect(screen.getByText('Edmonton Oilers')).toBeInTheDocument()
  })

  it('displays team statistics correctly', async () => {
    render(<TeamsLocationsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Total Teams')).toBeInTheDocument()
    })

    // Should show 2 total teams
    expect(screen.getByText('2')).toBeInTheDocument()
    // Should show 1 active team
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('opens create team dialog when add team button is clicked', async () => {
    const user = userEvent.setup()
    render(<TeamsLocationsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Calgary Flames')).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add team/i })
    await user.click(addButton)

    expect(screen.getByTestId('create-team-dialog')).toBeInTheDocument()
  })

  it('filters teams by search term', async () => {
    const user = userEvent.setup()
    render(<TeamsLocationsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Calgary Flames')).toBeInTheDocument()
      expect(screen.getByText('Edmonton Oilers')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search teams...')
    await user.type(searchInput, 'Calgary')

    // Calgary Flames should still be visible
    expect(screen.getByText('Calgary Flames')).toBeInTheDocument()
    // Edmonton Oilers should be filtered out (not visible in table)
    const oilersRows = screen.queryAllByText('Edmonton Oilers')
    expect(oilersRows).toHaveLength(0)
  })

  it('filters teams by division', async () => {
    const user = userEvent.setup()
    render(<TeamsLocationsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Calgary Flames')).toBeInTheDocument()
    })

    // Open division filter dropdown
    const divisionFilter = screen.getByRole('combobox')
    await user.click(divisionFilter)
    
    // Select U12 division
    const u12Option = screen.getByRole('option', { name: 'U12' })
    await user.click(u12Option)

    // Only Calgary Flames (U12) should be visible
    expect(screen.getByText('Calgary Flames')).toBeInTheDocument()
    const oilersRows = screen.queryAllByText('Edmonton Oilers')
    expect(oilersRows).toHaveLength(0)
  })

  it('opens team details dialog when view button is clicked', async () => {
    const user = userEvent.setup()
    render(<TeamsLocationsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Calgary Flames')).toBeInTheDocument()
    })

    // Find and click the first view button (eye icon)
    const viewButtons = screen.getAllByRole('button')
    const viewButton = viewButtons.find(button => 
      button.querySelector('svg')?.getAttribute('class')?.includes('lucide-eye')
    )
    
    if (viewButton) {
      await user.click(viewButton)
      expect(screen.getByTestId('team-details-dialog')).toBeInTheDocument()
      expect(screen.getByText('Team Details: Calgary Flames')).toBeInTheDocument()
    }
  })

  it('creates a new team successfully', async () => {
    const user = userEvent.setup()
    const mockCreateResponse = {
      success: true,
      data: {
        team: {
          id: '3',
          name: 'Test Team',
          age_group: 'U12',
          location: 'Calgary',
          contact_name: 'John Doe',
          contact_email: 'john@test.com',
          contact_phone: '403-555-0123',
          home_venue: 'Test Arena',
          colors: { primary: '#000000', secondary: '#FFFFFF' },
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }
      }
    }

    mockCreateTeam.mockResolvedValue(mockCreateResponse)
    
    render(<TeamsLocationsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Calgary Flames')).toBeInTheDocument()
    })

    // Open create team dialog
    const addButton = screen.getByRole('button', { name: /add team/i })
    await user.click(addButton)

    // Submit the form (mocked)
    const submitButton = screen.getByTestId('submit-team')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateTeam).toHaveBeenCalledWith({
        name: 'Test Team',
        age_group: 'U12',
        gender: 'Mixed',
        location: 'Calgary',
        contact_name: 'John Doe',
        contact_email: 'john@test.com',
        contact_phone: '403-555-0123',
        home_venue: 'Test Arena',
        colors: { primary: '#000000', secondary: '#FFFFFF' },
        is_active: true
      })
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Team created successfully'
    })
  })

  it('handles team creation error', async () => {
    const user = userEvent.setup()
    mockCreateTeam.mockRejectedValue(new Error('Creation failed'))
    
    render(<TeamsLocationsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Calgary Flames')).toBeInTheDocument()
    })

    // Open create team dialog and submit
    const addButton = screen.getByRole('button', { name: /add team/i })
    await user.click(addButton)

    const submitButton = screen.getByTestId('submit-team')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive'
      })
    })
  })

  it('handles API error when loading teams', async () => {
    mockGetTeams.mockRejectedValue(new Error('API Error'))
    
    render(<TeamsLocationsPage />)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to load teams and locations data',
        variant: 'destructive'
      })
    })
  })

  it('switches between teams and locations tabs', async () => {
    const user = userEvent.setup()
    render(<TeamsLocationsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Calgary Flames')).toBeInTheDocument()
    })

    // Click on Locations tab
    const locationsTab = screen.getByRole('tab', { name: 'Locations' })
    await user.click(locationsTab)

    // Should show locations content
    expect(screen.getByText('Venues Directory')).toBeInTheDocument()
    expect(screen.getByText('Manage facility information and availability')).toBeInTheDocument()

    // Switch back to Teams tab
    const teamsTab = screen.getByRole('tab', { name: 'Teams' })
    await user.click(teamsTab)

    // Should show teams content
    expect(screen.getByText('Teams Directory')).toBeInTheDocument()
    expect(screen.getByText('Manage team information and contacts')).toBeInTheDocument()
  })

  it('opens create location dialog', async () => {
    const user = userEvent.setup()
    render(<TeamsLocationsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Calgary Flames')).toBeInTheDocument()
    })

    // Switch to locations tab
    const locationsTab = screen.getByRole('tab', { name: 'Locations' })
    await user.click(locationsTab)

    // Click add location button
    const addLocationButton = screen.getByRole('button', { name: /add location/i })
    await user.click(addLocationButton)

    expect(screen.getByTestId('create-location-dialog')).toBeInTheDocument()
  })
})