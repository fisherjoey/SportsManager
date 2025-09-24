import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RefereeMobileCard } from '../components/data-table/RefereeMobileCard'

const mockReferee = {
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
  notes: '3 years officiating basketball in Northwest Basketball Association. Specializes in elite level games.',
  maxDistance: 15,
  postalCode: 'T2J 5W7',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z'
}

const mockRefereeWithMissingData = {
  id: 'ref-2',
  name: 'Sarah Connor',
  email: 'sarah.connor@cmba.ca',
  phone: null,
  role: 'referee',
  certificationLevel: 'Competitive',
  location: 'Northeast Calgary',
  isAvailable: false,
  certifications: null,
  preferredPositions: undefined,
  wagePerGame: null,
  notes: null,
  maxDistance: null,
  postalCode: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z'
}

describe('RefereeMobileCard Component', () => {
  describe('Basic Rendering', () => {
    test('renders referee information correctly', () => {
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
      expect(screen.getByText('mike.johnson@cmba.ca')).toBeInTheDocument()
      expect(screen.getByText('(403) 123-4567')).toBeInTheDocument()
      expect(screen.getByText('Northwest Calgary')).toBeInTheDocument()
      expect(screen.getByText('Elite')).toBeInTheDocument()
    })

    test('displays availability status correctly', () => {
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText('Available')).toBeInTheDocument()
    })

    test('displays unavailable status correctly', () => {
      render(
        <RefereeMobileCard
          referee={{ ...mockReferee, isAvailable: false }}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText('Unavailable')).toBeInTheDocument()
    })
  })

  describe('Certifications Display', () => {
    test('displays certifications when available', () => {
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText('NCCP Level 3 Basketball')).toBeInTheDocument()
      expect(screen.getByText('Basketball Canada Certified')).toBeInTheDocument()
    })

    test('handles empty certifications array', () => {
      render(
        <RefereeMobileCard
          referee={{ ...mockReferee, certifications: [] }}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText('None listed')).toBeInTheDocument()
    })

    test('handles null certifications gracefully', () => {
      render(
        <RefereeMobileCard
          referee={mockRefereeWithMissingData}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText('None listed')).toBeInTheDocument()
    })

    test('handles undefined certifications gracefully', () => {
      render(
        <RefereeMobileCard
          referee={{ ...mockReferee, certifications: undefined }}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText('None listed')).toBeInTheDocument()
    })
  })

  describe('Preferred Positions Display', () => {
    test('displays preferred positions when available', () => {
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText('Lead Official')).toBeInTheDocument()
      expect(screen.getByText('Center Official')).toBeInTheDocument()
    })

    test('handles empty preferred positions array', () => {
      render(
        <RefereeMobileCard
          referee={{ ...mockReferee, preferredPositions: [] }}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText('None specified')).toBeInTheDocument()
    })

    test('handles null preferred positions gracefully', () => {
      render(
        <RefereeMobileCard
          referee={mockRefereeWithMissingData}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText('None specified')).toBeInTheDocument()
    })
  })

  describe('CMBA-Specific Data', () => {
    test('displays Calgary postal codes correctly', () => {
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText(/T2J 5W7/)).toBeInTheDocument()
    })

    test('displays Calgary locations correctly', () => {
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText('Northwest Calgary')).toBeInTheDocument()
    })

    test('displays basketball-appropriate wage rates', () => {
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText(/\$85\.00/)).toBeInTheDocument()
    })

    test('displays basketball-specific notes', () => {
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      expect(screen.getByText(/basketball in Northwest Basketball Association/)).toBeInTheDocument()
    })
  })

  describe('Selection Functionality', () => {
    test('calls onSelect when card is clicked', () => {
      const mockOnSelect = jest.fn()
      
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      )

      const card = screen.getByRole('button') // Card should be clickable
      fireEvent.click(card)

      expect(mockOnSelect).toHaveBeenCalledWith(true)
    })

    test('shows selected state visually', () => {
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={true}
          onSelect={jest.fn()}
        />
      )

      const card = screen.getByRole('button')
      expect(card).toHaveClass('ring-2') // Should have selection styling
    })
  })

  describe('Action Buttons', () => {
    test('calls onEditReferee when edit button is clicked', () => {
      const mockOnEdit = jest.fn()
      
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={jest.fn()}
          onEditReferee={mockOnEdit}
        />
      )

      const editButton = screen.getByRole('button', { name: /edit/i })
      fireEvent.click(editButton)

      expect(mockOnEdit).toHaveBeenCalledWith(mockReferee)
    })

    test('calls onViewProfile when view profile button is clicked', () => {
      const mockOnViewProfile = jest.fn()
      
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={jest.fn()}
          onViewProfile={mockOnViewProfile}
        />
      )

      const viewButton = screen.getByRole('button', { name: /view profile/i })
      fireEvent.click(viewButton)

      expect(mockOnViewProfile).toHaveBeenCalledWith(mockReferee)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('handles missing phone number gracefully', () => {
      render(
        <RefereeMobileCard
          referee={mockRefereeWithMissingData}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      // Should render without crashing, phone might be displayed as empty or placeholder
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument()
    })

    test('handles missing wage information gracefully', () => {
      render(
        <RefereeMobileCard
          referee={mockRefereeWithMissingData}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      // Should render without crashing
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument()
    })

    test('handles missing notes gracefully', () => {
      render(
        <RefereeMobileCard
          referee={mockRefereeWithMissingData}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      // Should render without crashing
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={jest.fn()}
        />
      )

      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Mike Johnson'))
    })

    test('supports keyboard navigation', () => {
      const mockOnSelect = jest.fn()
      
      render(
        <RefereeMobileCard
          referee={mockReferee}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      )

      const card = screen.getByRole('button')
      fireEvent.keyDown(card, { key: 'Enter' })

      expect(mockOnSelect).toHaveBeenCalledWith(true)
    })
  })
})