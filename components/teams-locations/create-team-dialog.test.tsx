import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CreateTeamDialog } from './create-team-dialog'

const mockOnOpenChange = jest.fn()
const mockOnCreateTeam = jest.fn()

const defaultProps = {
  open: false,
  onOpenChange: mockOnOpenChange,
  onCreateTeam: mockOnCreateTeam
}

describe('CreateTeamDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not render when open is false', () => {
    render(<CreateTeamDialog {...defaultProps} />)
    
    expect(screen.queryByText('Add New Team')).not.toBeInTheDocument()
  })

  it('renders when open is true', () => {
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    expect(screen.getByText('Add New Team')).toBeInTheDocument()
    expect(screen.getByText('Create a new team in the system')).toBeInTheDocument()
  })

  it('renders all form fields', () => {
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    expect(screen.getByLabelText('Team Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Division')).toBeInTheDocument()
    expect(screen.getByLabelText('Location')).toBeInTheDocument()
    expect(screen.getByLabelText('Home Venue')).toBeInTheDocument()
    expect(screen.getByLabelText('Contact Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Contact Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Contact Phone')).toBeInTheDocument()
    expect(screen.getByLabelText('Founded Year')).toBeInTheDocument()
    expect(screen.getByLabelText('Website (Optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Primary Color')).toBeInTheDocument()
    expect(screen.getByLabelText('Secondary Color')).toBeInTheDocument()
    expect(screen.getByLabelText('Notes (Optional)')).toBeInTheDocument()
  })

  it('has correct default values', () => {
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    const foundedYearInput = screen.getByLabelText('Founded Year') as HTMLInputElement
    expect(foundedYearInput.value).toBe(new Date().getFullYear().toString())
    
    const primaryColorInput = screen.getByDisplayValue('#000000')
    expect(primaryColorInput).toBeInTheDocument()
    
    const secondaryColorInput = screen.getByDisplayValue('#FFFFFF')
    expect(secondaryColorInput).toBeInTheDocument()
  })

  it('handles form input changes', async () => {
    const user = userEvent.setup()
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    const teamNameInput = screen.getByLabelText('Team Name')
    await user.type(teamNameInput, 'Calgary Flames')
    
    expect(teamNameInput).toHaveValue('Calgary Flames')
  })

  it('handles division selection', async () => {
    const user = userEvent.setup()
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    // Open the division select
    const divisionSelect = screen.getByRole('combobox')
    await user.click(divisionSelect)
    
    // Wait for options and select U12
    await waitFor(() => {
      expect(screen.getByText('U12')).toBeInTheDocument()
    })
    
    const u12Option = screen.getByText('U12')
    await user.click(u12Option)
    
    // The select should now show U12
    expect(screen.getByText('U12')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: 'Create Team' })
    await user.click(submitButton)
    
    // Should not call onCreateTeam
    expect(mockOnCreateTeam).not.toHaveBeenCalled()
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    // Fill out required fields
    await user.type(screen.getByLabelText('Team Name'), 'Calgary Flames')
    await user.type(screen.getByLabelText('Location'), 'Calgary NW')
    await user.type(screen.getByLabelText('Contact Name'), 'John Doe')
    await user.type(screen.getByLabelText('Contact Email'), 'john@test.com')
    await user.type(screen.getByLabelText('Contact Phone'), '403-555-0123')
    
    // Select division using a different approach
    const divisionSelect = screen.getByRole('combobox')
    await user.click(divisionSelect)
    
    // Wait for options to appear, then use text query
    await waitFor(() => {
      expect(screen.getByText('U12')).toBeInTheDocument()
    })
    
    const u12Option = screen.getByText('U12')
    await user.click(u12Option)
    
    // Fill optional fields
    await user.type(screen.getByLabelText('Home Venue'), 'Saddledome')
    await user.type(screen.getByLabelText('Website (Optional)'), 'https://flames.com')
    await user.type(screen.getByLabelText('Notes (Optional)'), 'Test notes')
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Team' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnCreateTeam).toHaveBeenCalledWith({
        name: 'Calgary Flames',
        division: 'U12',
        location: 'Calgary NW',
        homeVenue: 'Saddledome',
        contactName: 'John Doe',
        contactEmail: 'john@test.com',
        contactPhone: '403-555-0123',
        foundedYear: new Date().getFullYear(),
        website: 'https://flames.com',
        primaryColor: '#000000',
        secondaryColor: '#FFFFFF',
        notes: 'Test notes',
        isActive: true,
        colors: {
          primary: '#000000',
          secondary: '#FFFFFF'
        }
      })
    })
  })

  it('handles color input changes', async () => {
    const user = userEvent.setup()
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    // Change primary color using the text input
    const primaryColorTextInputs = screen.getAllByDisplayValue('#000000')
    const primaryColorTextInput = primaryColorTextInputs[1] // Second one is the text input
    
    await user.clear(primaryColorTextInput)
    await user.type(primaryColorTextInput, '#FF0000')
    
    expect(primaryColorTextInput).toHaveValue('#FF0000')
  })

  it('handles founded year input', async () => {
    const user = userEvent.setup()
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    const foundedYearInput = screen.getByLabelText('Founded Year')
    await user.clear(foundedYearInput)
    await user.type(foundedYearInput, '2020')
    
    expect(foundedYearInput).toHaveValue(2020)
  })

  it('calls onOpenChange when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelButton)
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    // Fill and submit form
    await user.type(screen.getByLabelText('Team Name'), 'Test Team')
    await user.type(screen.getByLabelText('Location'), 'Test Location')
    await user.type(screen.getByLabelText('Contact Name'), 'Test Contact')
    await user.type(screen.getByLabelText('Contact Email'), 'test@test.com')
    await user.type(screen.getByLabelText('Contact Phone'), '403-555-0123')
    
    const submitButton = screen.getByRole('button', { name: 'Create Team' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnCreateTeam).toHaveBeenCalled()
    })
    
    // Form should be reset
    expect(screen.getByLabelText('Team Name')).toHaveValue('')
    expect(screen.getByLabelText('Location')).toHaveValue('')
    expect(screen.getByLabelText('Contact Name')).toHaveValue('')
  })

  it('has proper form validation attributes', () => {
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    expect(screen.getByLabelText('Team Name')).toHaveAttribute('required')
    expect(screen.getByLabelText('Location')).toHaveAttribute('required')
    expect(screen.getByLabelText('Contact Name')).toHaveAttribute('required')
    expect(screen.getByLabelText('Contact Email')).toHaveAttribute('required')
    expect(screen.getByLabelText('Contact Phone')).toHaveAttribute('required')
    
    expect(screen.getByLabelText('Contact Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Contact Phone')).toHaveAttribute('type', 'tel')
    expect(screen.getByLabelText('Founded Year')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('Website (Optional)')).toHaveAttribute('type', 'url')
  })

  it('handles form submission with Enter key', async () => {
    const user = userEvent.setup()
    render(<CreateTeamDialog {...defaultProps} open={true} />)
    
    // Fill required fields
    await user.type(screen.getByLabelText('Team Name'), 'Test Team')
    await user.type(screen.getByLabelText('Location'), 'Test Location')
    await user.type(screen.getByLabelText('Contact Name'), 'Test Contact')
    await user.type(screen.getByLabelText('Contact Email'), 'test@test.com')
    await user.type(screen.getByLabelText('Contact Phone'), '403-555-0123')
    
    // Press Enter to submit
    await user.keyboard('{Enter}')
    
    await waitFor(() => {
      expect(mockOnCreateTeam).toHaveBeenCalled()
    })
  })
})