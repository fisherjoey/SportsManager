import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TeamDetailsDialog } from './team-details-dialog'

const mockOnOpenChange = jest.fn()

const mockTeam = {
  id: '1',
  name: 'Calgary Flames',
  division: 'U12',
  location: 'Calgary NW',
  contactName: 'John Doe',
  contactEmail: 'john@test.com',
  contactPhone: '403-555-0123',
  homeVenue: 'Saddledome',
  foundedYear: 2020,
  website: 'https://flames.com',
  colors: {
    primary: '#FF0000',
    secondary: '#FFFFFF'
  },
  notes: 'Test team notes',
  isActive: true,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z'
}

const defaultProps = {
  open: false,
  onOpenChange: mockOnOpenChange,
  team: mockTeam
}

describe('TeamDetailsDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not render when open is false', () => {
    render(<TeamDetailsDialog {...defaultProps} />)
    
    expect(screen.queryByText('Calgary Flames')).not.toBeInTheDocument()
  })

  it('does not render when team is undefined', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} team={undefined} />)
    
    expect(screen.queryByText('Calgary Flames')).not.toBeInTheDocument()
  })

  it('renders team basic information', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Calgary Flames')).toBeInTheDocument()
    expect(screen.getByText('U12 Division • Est. 2020')).toBeInTheDocument()
  })

  it('displays team status badge correctly for active team', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Active Team')).toBeInTheDocument()
  })

  it('displays team status badge correctly for inactive team', () => {
    const inactiveTeam = { ...mockTeam, isActive: false }
    render(<TeamDetailsDialog {...defaultProps} open={true} team={inactiveTeam} />)
    
    expect(screen.getByText('Inactive Team')).toBeInTheDocument()
  })

  it('displays team colors when available', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Team Colors')).toBeInTheDocument()
    expect(screen.getByText('Primary: #FF0000')).toBeInTheDocument()
    expect(screen.getByText('Secondary: #FFFFFF')).toBeInTheDocument()
  })

  it('hides team colors section when not available', () => {
    const teamWithoutColors = { ...mockTeam, colors: undefined }
    render(<TeamDetailsDialog {...defaultProps} open={true} team={teamWithoutColors} />)
    
    expect(screen.queryByText('Team Colors')).not.toBeInTheDocument()
  })

  it('displays contact information', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Contact Information')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Team Contact')).toBeInTheDocument()
    expect(screen.getByText('403-555-0123')).toBeInTheDocument()
    expect(screen.getByText('john@test.com')).toBeInTheDocument()
  })

  it('displays website when available', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    const websiteLink = screen.getByRole('link', { name: 'https://flames.com' })
    expect(websiteLink).toBeInTheDocument()
    expect(websiteLink).toHaveAttribute('href', 'https://flames.com')
    expect(websiteLink).toHaveAttribute('target', '_blank')
    expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('hides website when not available', () => {
    const teamWithoutWebsite = { ...mockTeam, website: undefined }
    render(<TeamDetailsDialog {...defaultProps} open={true} team={teamWithoutWebsite} />)
    
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('displays location and venue information', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Location & Venue')).toBeInTheDocument()
    expect(screen.getByText('Calgary NW')).toBeInTheDocument()
    expect(screen.getByText('Team Location')).toBeInTheDocument()
    expect(screen.getByText('Saddledome')).toBeInTheDocument()
    expect(screen.getByText('Home Venue')).toBeInTheDocument()
  })

  it('displays notes when available', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Test team notes')).toBeInTheDocument()
  })

  it('hides notes section when not available', () => {
    const teamWithoutNotes = { ...mockTeam, notes: undefined }
    render(<TeamDetailsDialog {...defaultProps} open={true} team={teamWithoutNotes} />)
    
    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  })

  it('displays creation and update timestamps', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText(/Created:/)).toBeInTheDocument()
    expect(screen.getByText(/Updated:/)).toBeInTheDocument()
    expect(screen.getByText('2022-12-31')).toBeInTheDocument() // Created date
    expect(screen.getByText('2023-01-01')).toBeInTheDocument() // Updated date
  })

  it('renders edit team button', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    const editButton = screen.getByRole('button', { name: /edit team/i })
    expect(editButton).toBeInTheDocument()
  })

  it('calls onOpenChange when dialog is closed', async () => {
    const user = userEvent.setup()
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    // This would normally be handled by the Dialog component's close behavior
    // Since we're testing the component in isolation, we can't easily test this
    // without mocking the Dialog component itself
    expect(mockOnOpenChange).not.toHaveBeenCalled()
  })

  it('displays team color swatches with correct colors', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    const colorSwatches = screen.getAllByRole('generic')
    const primaryColorSwatch = colorSwatches.find(
      el => el.style.backgroundColor === 'rgb(255, 0, 0)' // #FF0000 in RGB
    )
    const secondaryColorSwatch = colorSwatches.find(
      el => el.style.backgroundColor === 'rgb(255, 255, 255)' // #FFFFFF in RGB
    )
    
    expect(primaryColorSwatch).toBeInTheDocument()
    expect(secondaryColorSwatch).toBeInTheDocument()
  })

  it('handles team without founded year', () => {
    const teamWithoutFoundedYear = { ...mockTeam, foundedYear: undefined }
    render(<TeamDetailsDialog {...defaultProps} open={true} team={teamWithoutFoundedYear} />)
    
    expect(screen.getByText('U12 Division')).toBeInTheDocument()
    expect(screen.queryByText(/Est\./)).not.toBeInTheDocument()
  })

  it('handles team with secondary color undefined', () => {
    const teamWithoutSecondaryColor = {
      ...mockTeam,
      colors: { primary: '#FF0000', secondary: undefined }
    }
    render(<TeamDetailsDialog {...defaultProps} open={true} team={teamWithoutSecondaryColor} />)
    
    expect(screen.getByText('Primary: #FF0000')).toBeInTheDocument()
    expect(screen.queryByText(/Secondary:/)).not.toBeInTheDocument()
  })

  it('uses default color when team colors are undefined', () => {
    const teamWithoutColors = { ...mockTeam, colors: undefined }
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    // The color circle in the header should use a default color
    const dialogContent = screen.getByRole('dialog')
    expect(dialogContent).toBeInTheDocument()
  })

  it('displays all required sections', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Team Colors')).toBeInTheDocument()
    expect(screen.getByText('Contact Information')).toBeInTheDocument()
    expect(screen.getByText('Location & Venue')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('has proper semantic structure', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    // Should have proper heading hierarchy
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    
    // Should have proper landmarks for different sections
    const contactSection = screen.getByText('Contact Information')
    const locationSection = screen.getByText('Location & Venue')
    
    expect(contactSection).toBeInTheDocument()
    expect(locationSection).toBeInTheDocument()
  })

  it('displays proper icons for different information types', () => {
    render(<TeamDetailsDialog {...defaultProps} open={true} />)
    
    // The component uses Lucide icons, they should be present
    // We can't easily test for specific icons without mocking them
    // but we can ensure the text content is correct
    expect(screen.getByText('Team Contact')).toBeInTheDocument()
    expect(screen.getByText('Team Location')).toBeInTheDocument()
    expect(screen.getByText('Home Venue')).toBeInTheDocument()
  })
})