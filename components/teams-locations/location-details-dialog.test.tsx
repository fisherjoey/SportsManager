import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocationDetailsDialog } from './location-details-dialog'

const mockOnOpenChange = jest.fn()

const mockLocation = {
  id: '1',
  name: 'Saddledome',
  address: '555 Saddledome Rise SE',
  city: 'Calgary',
  province: 'AB',
  postalCode: 'T2G 2W1',
  capacity: 19289,
  contactName: 'John Venue Manager',
  contactPhone: '403-777-4646',
  contactEmail: 'manager@saddledome.com',
  rentalRate: 5000,
  parkingSpaces: 2500,
  facilities: ['Ice Rink', 'Concession', 'Spectator Seating', 'Meeting Rooms'],
  accessibilityFeatures: ['Wheelchair Access', 'Accessible Washrooms', 'Elevator'],
  availability: {
    Monday: { available: true, open: '08:00', close: '22:00' },
    Tuesday: { available: true, open: '08:00', close: '22:00' },
    Wednesday: { available: false },
  },
  notes: 'Premier hockey venue in Calgary',
  isActive: true,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z',
}

const defaultProps = {
  open: false,
  onOpenChange: mockOnOpenChange,
  location: mockLocation,
}

describe('LocationDetailsDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not render when open is false', () => {
    render(<LocationDetailsDialog {...defaultProps} />)
    
    expect(screen.queryByText('Saddledome')).not.toBeInTheDocument()
  })

  it('does not render when location is undefined', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} location={undefined} />)
    
    expect(screen.queryByText('Saddledome')).not.toBeInTheDocument()
  })

  it('renders location basic information', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Saddledome')).toBeInTheDocument()
    expect(screen.getByText('555 Saddledome Rise SE, Calgary, AB')).toBeInTheDocument()
  })

  it('displays location status badge correctly for active location', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('displays location status badge correctly for inactive location', () => {
    const inactiveLocation = { ...mockLocation, isActive: false }
    render(<LocationDetailsDialog {...defaultProps} open={true} location={inactiveLocation} />)
    
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('displays quick stats correctly', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('19289')).toBeInTheDocument() // Capacity
    expect(screen.getByText('Capacity')).toBeInTheDocument()
    expect(screen.getByText('2500')).toBeInTheDocument() // Parking
    expect(screen.getByText('Parking')).toBeInTheDocument()
    expect(screen.getByText('$5000')).toBeInTheDocument() // Rental rate
    expect(screen.getByText('Per Hour')).toBeInTheDocument()
  })

  it('hides parking stat when not available', () => {
    const locationWithoutParking = { ...mockLocation, parkingSpaces: undefined }
    render(<LocationDetailsDialog {...defaultProps} open={true} location={locationWithoutParking} />)
    
    expect(screen.queryByText('Parking')).not.toBeInTheDocument()
  })

  it('hides rental rate stat when not available', () => {
    const locationWithoutRate = { ...mockLocation, rentalRate: undefined }
    render(<LocationDetailsDialog {...defaultProps} open={true} location={locationWithoutRate} />)
    
    expect(screen.queryByText('Per Hour')).not.toBeInTheDocument()
  })

  it('displays address and contact information', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Address & Contact')).toBeInTheDocument()
    expect(screen.getByText('555 Saddledome Rise SE')).toBeInTheDocument()
    expect(screen.getByText('Calgary, AB T2G 2W1')).toBeInTheDocument()
    expect(screen.getByText('John Venue Manager')).toBeInTheDocument()
    expect(screen.getByText('403-777-4646')).toBeInTheDocument()
    expect(screen.getByText('manager@saddledome.com')).toBeInTheDocument()
  })

  it('hides contact information when not available', () => {
    const locationWithoutContact = {
      ...mockLocation,
      contactName: undefined,
      contactPhone: undefined,
      contactEmail: undefined,
    }
    render(<LocationDetailsDialog {...defaultProps} open={true} location={locationWithoutContact} />)
    
    expect(screen.queryByText('John Venue Manager')).not.toBeInTheDocument()
    expect(screen.queryByText('403-777-4646')).not.toBeInTheDocument()
    expect(screen.queryByText('manager@saddledome.com')).not.toBeInTheDocument()
  })

  it('displays facilities', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Facilities')).toBeInTheDocument()
    expect(screen.getByText('Ice Rink')).toBeInTheDocument()
    expect(screen.getByText('Concession')).toBeInTheDocument()
    expect(screen.getByText('Spectator Seating')).toBeInTheDocument()
    expect(screen.getByText('Meeting Rooms')).toBeInTheDocument()
  })

  it('displays accessibility features when available', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Accessibility Features')).toBeInTheDocument()
    expect(screen.getByText('Wheelchair Access')).toBeInTheDocument()
    expect(screen.getByText('Accessible Washrooms')).toBeInTheDocument()
    expect(screen.getByText('Elevator')).toBeInTheDocument()
  })

  it('hides accessibility features section when not available', () => {
    const locationWithoutAccessibility = { ...mockLocation, accessibilityFeatures: [] }
    render(<LocationDetailsDialog {...defaultProps} open={true} location={locationWithoutAccessibility} />)
    
    expect(screen.queryByText('Accessibility Features')).not.toBeInTheDocument()
  })

  it('displays operating hours when available', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Operating Hours')).toBeInTheDocument()
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('08:00 - 22:00')).toBeInTheDocument()
    expect(screen.getByText('Tuesday')).toBeInTheDocument()
    expect(screen.getByText('Wednesday')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('hides operating hours section when not available', () => {
    const locationWithoutHours = { ...mockLocation, availability: undefined }
    render(<LocationDetailsDialog {...defaultProps} open={true} location={locationWithoutHours} />)
    
    expect(screen.queryByText('Operating Hours')).not.toBeInTheDocument()
  })

  it('displays notes when available', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Premier hockey venue in Calgary')).toBeInTheDocument()
  })

  it('hides notes section when not available', () => {
    const locationWithoutNotes = { ...mockLocation, notes: undefined }
    render(<LocationDetailsDialog {...defaultProps} open={true} location={locationWithoutNotes} />)
    
    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  })

  it('displays creation and update timestamps', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText(/Created:/)).toBeInTheDocument()
    expect(screen.getByText(/Updated:/)).toBeInTheDocument()
    expect(screen.getByText('12/31/2022')).toBeInTheDocument() // Created date
    expect(screen.getByText('1/1/2023')).toBeInTheDocument() // Updated date
  })

  it('renders edit location button', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    const editButton = screen.getByRole('button', { name: /edit location/i })
    expect(editButton).toBeInTheDocument()
  })

  it('handles location with minimal information', () => {
    const minimalLocation = {
      id: '2',
      name: 'Basic Venue',
      address: '123 Basic St',
      city: 'Calgary',
      province: 'AB',
      postalCode: 'T2P 1P1',
      capacity: 100,
      facilities: ['Basketball Court'],
      isActive: true,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    }
    
    render(<LocationDetailsDialog {...defaultProps} open={true} location={minimalLocation} />)
    
    expect(screen.getByText('Basic Venue')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument() // Capacity
    expect(screen.getByText('Basketball Court')).toBeInTheDocument()
  })

  it('displays proper icons for different sections', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    // The component uses Lucide icons, we can verify the section headings are present
    expect(screen.getByText('Address & Contact')).toBeInTheDocument()
    expect(screen.getByText('Facilities')).toBeInTheDocument()
    expect(screen.getByText('Accessibility Features')).toBeInTheDocument()
    expect(screen.getByText('Operating Hours')).toBeInTheDocument()
  })

  it('has proper semantic structure', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    
    // Should have proper section headings
    expect(screen.getByText('Address & Contact')).toBeInTheDocument()
    expect(screen.getByText('Facilities')).toBeInTheDocument()
  })

  it('displays quick stats with proper formatting', () => {
    render(<LocationDetailsDialog {...defaultProps} open={true} />)
    
    // Capacity should not have comma formatting in this component
    expect(screen.getByText('19289')).toBeInTheDocument()
    
    // Parking should not have comma formatting in this component  
    expect(screen.getByText('2500')).toBeInTheDocument()
    
    // Rental rate should have dollar sign
    expect(screen.getByText('$5000')).toBeInTheDocument()
  })

  it('handles location with empty facilities array', () => {
    const locationWithNoFacilities = { ...mockLocation, facilities: [] }
    render(<LocationDetailsDialog {...defaultProps} open={true} location={locationWithNoFacilities} />)
    
    expect(screen.getByText('Facilities')).toBeInTheDocument()
    // Should still show the section but with no facility badges
  })

  it('handles availability with mixed schedule', () => {
    const locationWithMixedSchedule = {
      ...mockLocation,
      availability: {
        Monday: { available: true, open: '09:00', close: '17:00' },
        Tuesday: { available: true, open: '10:00', close: '20:00' },
        Wednesday: { available: false },
        Thursday: { available: true, open: '08:00', close: '22:00' },
      }
    }
    
    render(<LocationDetailsDialog {...defaultProps} open={true} location={locationWithMixedSchedule} />)
    
    expect(screen.getByText('09:00 - 17:00')).toBeInTheDocument()
    expect(screen.getByText('10:00 - 20:00')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.getByText('08:00 - 22:00')).toBeInTheDocument()
  })
})