import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RefereeManagement } from '../components/referee-management'
import { useApi } from '../lib/api'
import { useToast } from '../components/ui/use-toast'

// Mock dependencies
jest.mock('../lib/api')
jest.mock('../components/ui/use-toast')

const mockToast = jest.fn()
const mockApi = {
  getReferees: jest.fn(),
  createInvitation: jest.fn()
}

beforeEach(() => {
  useApi.mockReturnValue(mockApi)
  useToast.mockReturnValue({ toast: mockToast })
  jest.clearAllMocks()
})

const mockReferees = [
  {
    id: 'ref-1',
    name: 'Mike Johnson',
    email: 'mike.johnson@cmba.ca',
    phone: '(403) 123-4567',
    role: 'referee',
    certificationLevel: 'Elite',
    location: 'Northwest Calgary',
    isAvailable: true,
    certifications: ['NCCP Level 3 Basketball', 'Basketball Canada Certified'],
    preferredPositions: ['Lead Official', 'Center Official'],
    wagePerGame: '85.00',
    notes: '3 years officiating basketball',
    maxDistance: 15,
    postalCode: 'T2J 5W7',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'ref-2',
    name: 'Sarah Connor',
    email: 'sarah.connor@cmba.ca',
    phone: '(403) 987-6543',
    role: 'referee',
    certificationLevel: 'Competitive',
    location: 'Northeast Calgary',
    isAvailable: false,
    certifications: ['NCCP Level 2 Basketball'],
    preferredPositions: ['Trail Official'],
    wagePerGame: '65.00',
    notes: '5 years officiating basketball',
    maxDistance: 20,
    postalCode: 'T1Y 9L0',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'ref-3',
    name: 'David Martinez',
    email: 'david.martinez@cmba.ca',
    phone: '(403) 555-1234',
    role: 'referee',
    certificationLevel: 'Recreational',
    location: 'Southwest Calgary',
    isAvailable: true,
    certifications: ['NCCP Level 1 Basketball'],
    preferredPositions: ['Lead Official'],
    wagePerGame: '45.00',
    notes: '2 years officiating basketball',
    maxDistance: 25,
    postalCode: 'T2W 8E0',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
]

describe('RefereeManagement Component', () => {
  describe('Data Loading', () => {
    test('loads referees on component mount', async () => {
      mockApi.getReferees.mockResolvedValue({
        data: { referees: mockReferees }
      })

      render(<RefereeManagement />)

      await waitFor(() => {
        expect(mockApi.getReferees).toHaveBeenCalledWith({ limit: 100 })
      })
    })

    test('displays loading state initially', () => {
      mockApi.getReferees.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<RefereeManagement />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    test('handles API errors gracefully', async () => {
      mockApi.getReferees.mockRejectedValue(new Error('API Error'))

      render(<RefereeManagement />)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to load referees. Please try again.',
          variant: 'destructive'
        })
      })
    })
  })

  describe('Statistics Display', () => {
    beforeEach(async () => {
      mockApi.getReferees.mockResolvedValue({
        data: { referees: mockReferees }
      })
    })

    test('calculates total referees correctly', async () => {
      render(<RefereeManagement />)

      await waitFor(() => {
        expect(screen.getByText('Total Referees')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument() // 3 mock referees
      })
    })

    test('calculates elite level referees correctly', async () => {
      render(<RefereeManagement />)

      await waitFor(() => {
        expect(screen.getByText('Elite Level')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument() // 1 elite referee in mock data
      })
    })

    test('handles empty referee list', async () => {
      mockApi.getReferees.mockResolvedValue({
        data: { referees: [] }
      })

      render(<RefereeManagement />)

      await waitFor(() => {
        expect(screen.getByText('Total Referees')).toBeInTheDocument()
        expect(screen.getByText('0')).toBeInTheDocument()
      })
    })

    test('handles non-array referee data safely', async () => {
      mockApi.getReferees.mockResolvedValue({
        data: { referees: null }
      })

      render(<RefereeManagement />)

      await waitFor(() => {
        // Should not crash and should show 0 stats
        expect(screen.getByText('Total Referees')).toBeInTheDocument()
        expect(screen.getByText('0')).toBeInTheDocument()
      })
    })
  })

  describe('Data Table Integration', () => {
    beforeEach(async () => {
      mockApi.getReferees.mockResolvedValue({
        data: { referees: mockReferees }
      })
    })

    test('passes referee data to DataTable', async () => {
      render(<RefereeManagement />)

      await waitFor(() => {
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
        expect(screen.getByText('Sarah Connor')).toBeInTheDocument()
        expect(screen.getByText('David Martinez')).toBeInTheDocument()
      })
    })

    test('enables view toggle for table/cards', async () => {
      render(<RefereeManagement />)

      await waitFor(() => {
        // Check that view toggle buttons are present
        const tableViewButton = screen.getByRole('button', { name: /table view/i })
        const cardViewButton = screen.getByRole('button', { name: /card view/i })
        
        expect(tableViewButton || cardViewButton).toBeInTheDocument()
      })
    })
  })

  describe('Referee Invitation', () => {
    beforeEach(async () => {
      mockApi.getReferees.mockResolvedValue({
        data: { referees: mockReferees }
      })
    })

    test('opens invitation dialog when invite button is clicked', async () => {
      render(<RefereeManagement />)

      await waitFor(() => {
        const inviteButton = screen.getByText('Invite New Referee')
        fireEvent.click(inviteButton)
        
        expect(screen.getByText('Invite Referee')).toBeInTheDocument()
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
        expect(screen.getByLabelText('First Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Last Name')).toBeInTheDocument()
      })
    })

    test('submits invitation form successfully', async () => {
      mockApi.createInvitation.mockResolvedValue({
        data: { invitation_link: 'http://example.com/invite/123' }
      })

      render(<RefereeManagement />)

      await waitFor(() => {
        const inviteButton = screen.getByText('Invite New Referee')
        fireEvent.click(inviteButton)
      })

      // Fill out the form
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'new.referee@cmba.ca' }
      })
      fireEvent.change(screen.getByLabelText('First Name'), {
        target: { value: 'John' }
      })
      fireEvent.change(screen.getByLabelText('Last Name'), {
        target: { value: 'Doe' }
      })

      // Submit the form
      const submitButton = screen.getByText('Send Invitation')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockApi.createInvitation).toHaveBeenCalledWith({
          email: 'new.referee@cmba.ca',
          firstName: 'John',
          lastName: 'Doe',
          role: 'referee'
        })

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Invitation sent',
          description: 'Invitation sent to new.referee@cmba.ca. They will receive an email with signup instructions.'
        })
      })
    })

    test('handles invitation API errors', async () => {
      mockApi.createInvitation.mockRejectedValue(new Error('API Error'))

      render(<RefereeManagement />)

      await waitFor(() => {
        const inviteButton = screen.getByText('Invite New Referee')
        fireEvent.click(inviteButton)
      })

      // Fill out and submit the form
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'new.referee@cmba.ca' }
      })
      fireEvent.change(screen.getByLabelText('First Name'), {
        target: { value: 'John' }
      })
      fireEvent.change(screen.getByLabelText('Last Name'), {
        target: { value: 'Doe' }
      })

      const submitButton = screen.getByText('Send Invitation')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to send invitation. Please try again.',
          variant: 'destructive'
        })
      })
    })
  })

  describe('CMBA Data Validation', () => {
    test('displays Calgary-specific locations correctly', async () => {
      mockApi.getReferees.mockResolvedValue({
        data: { referees: mockReferees }
      })

      render(<RefereeManagement />)

      await waitFor(() => {
        expect(screen.getByText('Northwest Calgary')).toBeInTheDocument()
        expect(screen.getByText('Northeast Calgary')).toBeInTheDocument()
        expect(screen.getByText('Southwest Calgary')).toBeInTheDocument()
      })
    })

    test('displays basketball-specific certifications', async () => {
      mockApi.getReferees.mockResolvedValue({
        data: { referees: mockReferees }
      })

      render(<RefereeManagement />)

      await waitFor(() => {
        expect(screen.getByText(/NCCP Level 3 Basketball/)).toBeInTheDocument()
        expect(screen.getByText(/Basketball Canada Certified/)).toBeInTheDocument()
      })
    })

    test('displays appropriate wage ranges for different levels', async () => {
      mockApi.getReferees.mockResolvedValue({
        data: { referees: mockReferees }
      })

      render(<RefereeManagement />)

      await waitFor(() => {
        // Elite: $85, Competitive: $65, Recreational: $45
        expect(screen.getByText(/85\.00/)).toBeInTheDocument()
        expect(screen.getByText(/65\.00/)).toBeInTheDocument()
        expect(screen.getByText(/45\.00/)).toBeInTheDocument()
      })
    })
  })
})