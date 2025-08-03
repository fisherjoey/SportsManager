import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CreateLocationDialog } from './create-location-dialog'

const mockOnOpenChange = jest.fn()
const mockOnCreateLocation = jest.fn()

const defaultProps = {
  open: false,
  onOpenChange: mockOnOpenChange,
  onCreateLocation: mockOnCreateLocation
}

describe('CreateLocationDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not render when open is false', () => {
    render(<CreateLocationDialog {...defaultProps} />)
    
    expect(screen.queryByText('Add New Location')).not.toBeInTheDocument()
  })

  it('renders when open is true', () => {
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Add New Location')).toBeInTheDocument()
    expect(screen.getByText('Create a new venue in the system')).toBeInTheDocument()
  })

  it('renders all form fields', () => {
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    expect(screen.getByLabelText('Venue Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Address')).toBeInTheDocument()
    expect(screen.getByLabelText('City')).toBeInTheDocument()
    expect(screen.getByLabelText('Province')).toBeInTheDocument()
    expect(screen.getByLabelText('Postal Code')).toBeInTheDocument()
    expect(screen.getByLabelText('Capacity')).toBeInTheDocument()
    expect(screen.getByLabelText('Rental Rate ($/hour)')).toBeInTheDocument()
    expect(screen.getByLabelText('Parking Spaces')).toBeInTheDocument()
    expect(screen.getByLabelText('Contact Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Contact Phone')).toBeInTheDocument()
    expect(screen.getByLabelText('Contact Email')).toBeInTheDocument()
    expect(screen.getByText('Facilities')).toBeInTheDocument()
    expect(screen.getByText('Accessibility Features')).toBeInTheDocument()
    expect(screen.getByLabelText('Notes (Optional)')).toBeInTheDocument()
  })

  it('has correct default values', () => {
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    const provinceInput = screen.getByLabelText('Province') as HTMLInputElement
    expect(provinceInput.value).toBe('AB')
    
    const capacityInput = screen.getByLabelText('Capacity') as HTMLInputElement
    expect(capacityInput.value).toBe('0')
  })

  it('renders all facility options', () => {
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    const expectedFacilities = [
      'Basketball Court',
      'Multiple Courts',
      'Volleyball Courts',
      'Parking',
      'Concession',
      'Changerooms',
      'Spectator Seating',
      'Fitness Centre',
      'Pool',
      'Ice Rink',
      'Track',
      'Meeting Rooms'
    ]
    
    expectedFacilities.forEach(facility => {
      expect(screen.getByLabelText(facility)).toBeInTheDocument()
    })
  })

  it('renders all accessibility options', () => {
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    const expectedAccessibility = [
      'Wheelchair Access',
      'Accessible Washrooms',
      'Accessible Parking',
      'Elevator',
      'Ramps',
      'Audio Assistance'
    ]
    
    expectedAccessibility.forEach(feature => {
      expect(screen.getByLabelText(feature)).toBeInTheDocument()
    })
  })

  it('handles form input changes', async () => {
    const user = userEvent.setup()
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    const venueNameInput = screen.getByLabelText('Venue Name')
    await user.type(venueNameInput, 'Saddledome')
    
    expect(venueNameInput).toHaveValue('Saddledome')
  })

  it('handles facility selection', async () => {
    const user = userEvent.setup()
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    const basketballCourtCheckbox = screen.getByLabelText('Basketball Court')
    await user.click(basketballCourtCheckbox)
    
    expect(basketballCourtCheckbox).toBeChecked()
  })

  it('handles accessibility feature selection', async () => {
    const user = userEvent.setup()
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    const wheelchairAccessCheckbox = screen.getByLabelText('Wheelchair Access')
    await user.click(wheelchairAccessCheckbox)
    
    expect(wheelchairAccessCheckbox).toBeChecked()
  })

  it('handles number input changes', async () => {
    const user = userEvent.setup()
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    const capacityInput = screen.getByLabelText('Capacity')
    await user.clear(capacityInput)
    await user.type(capacityInput, '500')
    
    expect(capacityInput).toHaveValue(500)
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    // Fill out required fields
    await user.type(screen.getByLabelText('Venue Name'), 'Test Arena')
    await user.type(screen.getByLabelText('Address'), '123 Test St')
    await user.type(screen.getByLabelText('City'), 'Calgary')
    await user.type(screen.getByLabelText('Postal Code'), 'T2G 5B6')
    
    // Set capacity
    const capacityInput = screen.getByLabelText('Capacity')
    await user.clear(capacityInput)
    await user.type(capacityInput, '1000')
    
    // Select facilities
    await user.click(screen.getByLabelText('Basketball Court'))
    await user.click(screen.getByLabelText('Parking'))
    
    // Select accessibility features
    await user.click(screen.getByLabelText('Wheelchair Access'))
    
    // Fill optional fields
    await user.type(screen.getByLabelText('Contact Name'), 'John Doe')
    await user.type(screen.getByLabelText('Contact Phone'), '403-555-0123')
    await user.type(screen.getByLabelText('Contact Email'), 'john@test.com')
    await user.type(screen.getByLabelText('Notes (Optional)'), 'Test notes')
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Location' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnCreateLocation).toHaveBeenCalledWith({
        name: 'Test Arena',
        address: '123 Test St',
        city: 'Calgary',
        province: 'AB',
        postalCode: 'T2G 5B6',
        capacity: 1000,
        contactName: 'John Doe',
        contactPhone: '403-555-0123',
        contactEmail: 'john@test.com',
        rentalRate: 0,
        parkingSpaces: 0,
        facilities: ['Basketball Court', 'Parking'],
        accessibilityFeatures: ['Wheelchair Access'],
        notes: 'Test notes',
        isActive: true
      })
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: 'Create Location' })
    await user.click(submitButton)
    
    // Should not call onCreateLocation
    expect(mockOnCreateLocation).not.toHaveBeenCalled()
  })

  it('calls onOpenChange when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelButton)
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    // Fill and submit form
    await user.type(screen.getByLabelText('Venue Name'), 'Test Arena')
    await user.type(screen.getByLabelText('Address'), '123 Test St')
    await user.type(screen.getByLabelText('City'), 'Calgary')
    await user.type(screen.getByLabelText('Postal Code'), 'T2G 5B6')
    
    await user.click(screen.getByLabelText('Basketball Court'))
    
    const submitButton = screen.getByRole('button', { name: 'Create Location' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnCreateLocation).toHaveBeenCalled()
    })
    
    // Form should be reset
    expect(screen.getByLabelText('Venue Name')).toHaveValue('')
    expect(screen.getByLabelText('Address')).toHaveValue('')
    expect(screen.getByLabelText('City')).toHaveValue('')
    expect(screen.getByLabelText('Basketball Court')).not.toBeChecked()
  })

  it('handles unchecking facilities', async () => {
    const user = userEvent.setup()
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    const basketballCourtCheckbox = screen.getByLabelText('Basketball Court')
    
    // Check it first
    await user.click(basketballCourtCheckbox)
    expect(basketballCourtCheckbox).toBeChecked()
    
    // Then uncheck it
    await user.click(basketballCourtCheckbox)
    expect(basketballCourtCheckbox).not.toBeChecked()
  })

  it('handles unchecking accessibility features', async () => {
    const user = userEvent.setup()
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    const wheelchairAccessCheckbox = screen.getByLabelText('Wheelchair Access')
    
    // Check it first
    await user.click(wheelchairAccessCheckbox)
    expect(wheelchairAccessCheckbox).toBeChecked()
    
    // Then uncheck it
    await user.click(wheelchairAccessCheckbox)
    expect(wheelchairAccessCheckbox).not.toBeChecked()
  })

  it('has proper form validation attributes', () => {
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    expect(screen.getByLabelText('Venue Name')).toHaveAttribute('required')
    expect(screen.getByLabelText('Address')).toHaveAttribute('required')
    expect(screen.getByLabelText('City')).toHaveAttribute('required')
    expect(screen.getByLabelText('Province')).toHaveAttribute('required')
    expect(screen.getByLabelText('Postal Code')).toHaveAttribute('required')
    expect(screen.getByLabelText('Capacity')).toHaveAttribute('required')
    
    expect(screen.getByLabelText('Capacity')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('Rental Rate ($/hour)')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('Parking Spaces')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('Contact Phone')).toHaveAttribute('type', 'tel')
    expect(screen.getByLabelText('Contact Email')).toHaveAttribute('type', 'email')
  })

  it('handles postal code placeholder', () => {
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    const postalCodeInput = screen.getByLabelText('Postal Code')
    expect(postalCodeInput).toHaveAttribute('placeholder', 'T2G 5B6')
  })

  it('handles contact phone placeholder', () => {
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    const phoneInput = screen.getByLabelText('Contact Phone')
    expect(phoneInput).toHaveAttribute('placeholder', '(403) 555-0123')
  })

  it('submits form with multiple facilities and accessibility features', async () => {
    const user = userEvent.setup()
    render(<CreateLocationDialog {...defaultProps} open={true} />)
    
    // Fill required fields
    await user.type(screen.getByLabelText('Venue Name'), 'Multi-Purpose Arena')
    await user.type(screen.getByLabelText('Address'), '456 Multi St')
    await user.type(screen.getByLabelText('City'), 'Edmonton')
    await user.type(screen.getByLabelText('Postal Code'), 'T5K 1X1')
    
    const capacityInput = screen.getByLabelText('Capacity')
    await user.clear(capacityInput)
    await user.type(capacityInput, '2000')
    
    // Select multiple facilities
    await user.click(screen.getByLabelText('Basketball Court'))
    await user.click(screen.getByLabelText('Volleyball Courts'))
    await user.click(screen.getByLabelText('Concession'))
    
    // Select multiple accessibility features
    await user.click(screen.getByLabelText('Wheelchair Access'))
    await user.click(screen.getByLabelText('Accessible Washrooms'))
    await user.click(screen.getByLabelText('Elevator'))
    
    const submitButton = screen.getByRole('button', { name: 'Create Location' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnCreateLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Multi-Purpose Arena',
          facilities: ['Basketball Court', 'Volleyball Courts', 'Concession'],
          accessibilityFeatures: ['Wheelchair Access', 'Accessible Washrooms', 'Elevator']
        })
      )
    })
  })
})