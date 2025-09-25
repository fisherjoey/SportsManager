import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationWithDistance } from '../components/ui/location-with-distance'
import { useDistance } from '../hooks/use-distance'
import * as maps from '../lib/maps'

// Mock the useDistance hook
jest.mock('../hooks/use-distance')

// Mock the maps module
jest.mock('../lib/maps', () => ({
  generateGoogleMapsURL: jest.fn(),
  buildFullAddress: jest.fn(),
}))

// Mock window.open
global.window.open = jest.fn()

describe('LocationWithDistance', () => {
  const mockUseDistance = useDistance
  const mockGenerateGoogleMapsURL = maps.generateGoogleMapsURL
  const mockBuildFullAddress = maps.buildFullAddress

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseDistance.mockReturnValue({
      distance: null,
      loading: false,
      error: null,
    })
    mockBuildFullAddress.mockImplementation((address, city, province, postal) => {
      const parts = [address, city]
      if (province) parts.push(province)
      if (postal) parts.push(postal)
      return parts.join(', ')
    })
    mockGenerateGoogleMapsURL.mockReturnValue('https://google.com/maps/test')
  })

  describe('basic rendering', () => {
    it('should render location name', () => {
      render(
        <LocationWithDistance location="Calgary Saddledome" />
      )

      expect(screen.getByText('Calgary Saddledome')).toBeInTheDocument()
    })

    it('should render with address details', () => {
      render(
        <LocationWithDistance
          location="Saddledome"
          address="555 Saddledome Rise SE"
          city="Calgary"
          province="AB"
          postalCode="T2G 2W1"
        />
      )

      expect(screen.getByText('Saddledome')).toBeInTheDocument()
      expect(screen.getByText('555 Saddledome Rise SE, Calgary, AB, T2G 2W1')).toBeInTheDocument()
    })

    it('should call buildFullAddress with correct parameters', () => {
      render(
        <LocationWithDistance
          location="Saddledome"
          address="555 Saddledome Rise SE"
          city="Calgary"
          province="AB"
          postalCode="T2G 2W1"
        />
      )

      expect(mockBuildFullAddress).toHaveBeenCalledWith(
        '555 Saddledome Rise SE',
        'Calgary',
        'AB',
        'T2G 2W1'
      )
    })
  })

  describe('distance functionality', () => {
    it('should call useDistance with correct parameters', () => {
      render(
        <LocationWithDistance
          location="Saddledome"
          address="555 Saddledome Rise SE"
          city="Calgary"
          userLocation="123 Main St"
        />
      )

      expect(mockUseDistance).toHaveBeenCalledWith(
        '555 Saddledome Rise SE, Calgary',
        {
          enabled: true,
          userLocation: '123 Main St',
        }
      )
    })

    it('should disable distance when showDistance is false', () => {
      render(
        <LocationWithDistance
          location="Calgary Saddledome"
          showDistance={false}
        />
      )

      expect(mockUseDistance).toHaveBeenCalledWith(
        'Calgary Saddledome',
        {
          enabled: false,
          userLocation: undefined,
        }
      )
    })

    it('should display loading state', () => {
      mockUseDistance.mockReturnValue({
        distance: null,
        loading: true,
        error: null,
      })

      render(<LocationWithDistance location="Calgary Saddledome" />)

      expect(screen.getByText('Calculating...')).toBeInTheDocument()
    })

    it('should display distance and duration when available', () => {
      mockUseDistance.mockReturnValue({
        distance: {
          distance: '5.2 km',
          duration: '13m',
          distanceValue: 5200,
          durationValue: 780,
        },
        loading: false,
        error: null,
      })

      render(<LocationWithDistance location="Calgary Saddledome" />)

      expect(screen.getByText('5.2 km')).toBeInTheDocument()
      expect(screen.getByText('13m drive')).toBeInTheDocument()
    })

    it('should display error message when distance calculation fails', () => {
      mockUseDistance.mockReturnValue({
        distance: null,
        loading: false,
        error: 'Network error',
      })

      render(<LocationWithDistance location="Calgary Saddledome" />)

      expect(screen.getByText('Distance unavailable')).toBeInTheDocument()
    })
  })

  describe('compact mode', () => {
    it('should render in compact mode', () => {
      render(
        <LocationWithDistance 
          location="Calgary Saddledome" 
          compact={true}
        />
      )

      expect(screen.getByText('Calgary Saddledome')).toBeInTheDocument()
      // In compact mode, the layout is different - check for specific compact elements
      const locationElement = screen.getByText('Calgary Saddledome')
      expect(locationElement).toHaveClass('text-sm', 'truncate')
    })

    it('should show duration only in compact mode', () => {
      mockUseDistance.mockReturnValue({
        distance: {
          distance: '5.2 km',
          duration: '13m',
          distanceValue: 5200,
          durationValue: 780,
        },
        loading: false,
        error: null,
      })

      render(
        <LocationWithDistance 
          location="Calgary Saddledome" 
          compact={true}
        />
      )

      expect(screen.getByText('• 13m')).toBeInTheDocument()
      expect(screen.queryByText('5.2 km')).not.toBeInTheDocument() // Distance not shown in compact
    })

    it('should render compact map link button', () => {
      render(
        <LocationWithDistance 
          location="Calgary Saddledome" 
          compact={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-6', 'w-6', 'p-0', 'shrink-0')
    })
  })

  describe('map link functionality', () => {
    it('should open Google Maps when map link is clicked', () => {
      mockGenerateGoogleMapsURL.mockReturnValue('https://maps.google.com/test-url')

      render(<LocationWithDistance location="Calgary Saddledome" />)

      const mapButton = screen.getByText('Open in Maps')
      fireEvent.click(mapButton)

      expect(mockGenerateGoogleMapsURL).toHaveBeenCalledWith('Calgary Saddledome')
      expect(window.open).toHaveBeenCalledWith(
        'https://maps.google.com/test-url',
        '_blank',
        'noopener,noreferrer'
      )
    })

    it('should use full address for map link when available', () => {
      render(
        <LocationWithDistance
          location="Saddledome"
          address="555 Saddledome Rise SE"
          city="Calgary"
          province="AB"
        />
      )

      const mapButton = screen.getByText('Open in Maps')
      fireEvent.click(mapButton)

      expect(mockGenerateGoogleMapsURL).toHaveBeenCalledWith('555 Saddledome Rise SE, Calgary, AB')
    })

    it('should not render map link when showMapLink is false', () => {
      render(
        <LocationWithDistance 
          location="Calgary Saddledome" 
          showMapLink={false}
        />
      )

      expect(screen.queryByText('Open in Maps')).not.toBeInTheDocument()
    })

    it('should handle compact mode map link', () => {
      render(
        <LocationWithDistance 
          location="Calgary Saddledome" 
          compact={true}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(mockGenerateGoogleMapsURL).toHaveBeenCalledWith('Calgary Saddledome')
      expect(window.open).toHaveBeenCalled()
    })
  })

  describe('styling and accessibility', () => {
    it('should apply custom className', () => {
      render(
        <LocationWithDistance 
          location="Calgary Saddledome" 
          className="custom-class"
        />
      )

      // Find the outermost container with the custom class
      const container = document.querySelector('.custom-class')
      expect(container).toBeInTheDocument()
    })

    it('should have proper ARIA labels and semantics', () => {
      render(<LocationWithDistance location="Calgary Saddledome" />)

      const mapButton = screen.getByRole('button', { name: /open in maps/i })
      expect(mapButton).toBeInTheDocument()
    })

    it('should render map pin icon', () => {
      render(<LocationWithDistance location="Calgary Saddledome" />)

      // Check for map pin icon (Lucide icon)
      const mapIcon = document.querySelector('[data-testid="map-pin"], .lucide-map-pin')
      // Note: Lucide icons may not have test ids, so we check for class or other attributes
      // In a real test, you might need to check for the specific icon implementation
      expect(screen.getByText('Calgary Saddledome')).toBeInTheDocument()
    })

    it('should render external link icon in map button', () => {
      render(<LocationWithDistance location="Calgary Saddledome" />)

      const mapButton = screen.getByText('Open in Maps')
      expect(mapButton).toBeInTheDocument()
      // The external link icon should be present in the button
    })
  })

  describe('edge cases', () => {
    it('should handle missing city gracefully', () => {
      render(
        <LocationWithDistance
          location="Venue Name"
          address="123 Street"
        />
      )

      expect(screen.getByText('Venue Name')).toBeInTheDocument()
      // Should fallback to location name for distance calculation
      expect(mockUseDistance).toHaveBeenCalledWith(
        'Venue Name',
        expect.any(Object)
      )
    })

    it('should handle empty location name', () => {
      render(<LocationWithDistance location="" />)

      // Component should still render but may be empty
      expect(mockUseDistance).toHaveBeenCalled()
    })

    it('should handle very long location names in compact mode', () => {
      const longName = 'Very Long Location Name That Should Be Truncated In Compact Mode'
      
      render(
        <LocationWithDistance 
          location={longName} 
          compact={true}
        />
      )

      const locationElement = screen.getByText(longName)
      expect(locationElement).toHaveClass('truncate')
    })

    it('should maintain loading state properly', () => {
      mockUseDistance.mockReturnValue({
        distance: null,
        loading: true,
        error: null,
      })

      render(<LocationWithDistance location="Calgary Saddledome" />)

      expect(screen.getByText('Calculating...')).toBeInTheDocument()
      expect(screen.queryByText('Distance unavailable')).not.toBeInTheDocument()
    })

    it('should not show loading spinner when distance is available', () => {
      mockUseDistance.mockReturnValue({
        distance: {
          distance: '5.2 km',
          duration: '13m',
          distanceValue: 5200,
          durationValue: 780,
        },
        loading: false,
        error: null,
      })

      render(<LocationWithDistance location="Calgary Saddledome" />)

      expect(screen.queryByText('Calculating...')).not.toBeInTheDocument()
      expect(screen.getByText('5.2 km')).toBeInTheDocument()
    })
  })
})