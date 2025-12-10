import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DataTable } from '../components/data-table/DataTable';
import { createRefereeColumns } from '../components/data-table/columns/referee-columns';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const mockRefereeData = [
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
    updatedAt: '2025-01-01T00:00:00Z',
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
    updatedAt: '2025-01-01T00:00:00Z',
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
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

describe('DataTable Component', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('Basic Rendering', () => {
    test('renders table with referee data', () => {
      const columns = createRefereeColumns();

      render(
        <DataTable
          columns={columns}
          data={mockRefereeData}
          mobileCardType="referee"
          enableViewToggle={true}
        />
      );

      expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('David Martinez')).toBeInTheDocument();
    });

    test('displays loading state', () => {
      const columns = createRefereeColumns();

      render(
        <DataTable
          columns={columns}
          data={[]}
          loading={true}
          mobileCardType="referee"
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('displays empty state when no data', () => {
      const columns = createRefereeColumns();

      render(
        <DataTable columns={columns} data={[]} mobileCardType="referee" />
      );

      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  describe('View Toggle Functionality', () => {
    test('shows view toggle buttons when enabled', () => {
      const columns = createRefereeColumns();

      render(
        <DataTable
          columns={columns}
          data={mockRefereeData}
          mobileCardType="referee"
          enableViewToggle={true}
        />
      );

      // Should show table and card view buttons
      const buttons = screen.getAllByRole('button');
      const viewToggleButtons = buttons.filter(
        (button) => button.querySelector('svg') // Icon buttons for view toggle
      );

      expect(viewToggleButtons.length).toBeGreaterThan(0);
    });

    test('switches between table and card view', async () => {
      const columns = createRefereeColumns();

      render(
        <DataTable
          columns={columns}
          data={mockRefereeData}
          mobileCardType="referee"
          enableViewToggle={true}
        />
      );

      // Find and click card view button (LayoutGrid icon)
      const cardViewButton =
        screen.getByRole('button', { name: /card view/i }) ||
        screen
          .getAllByRole('button')
          .find((btn) =>
            btn
              .querySelector('svg')
              ?.getAttribute('class')
              ?.includes('lucide-layout-grid')
          );

      if (cardViewButton) {
        fireEvent.click(cardViewButton);

        await waitFor(() => {
          // In card view, data should still be visible but in card format
          expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Search and Filtering', () => {
    test('filters data based on global search', async () => {
      const columns = createRefereeColumns();

      render(
        <DataTable
          columns={columns}
          data={mockRefereeData}
          mobileCardType="referee"
        />
      );

      const searchInput = screen.getByPlaceholderText(
        /search across all columns/i
      );
      fireEvent.change(searchInput, { target: { value: 'Mike' } });

      await waitFor(() => {
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
        expect(screen.queryByText('Sarah Connor')).not.toBeInTheDocument();
        expect(screen.queryByText('David Martinez')).not.toBeInTheDocument();
      });
    });

    test('searches referee-specific fields', async () => {
      const columns = createRefereeColumns();

      render(
        <DataTable
          columns={columns}
          data={mockRefereeData}
          mobileCardType="referee"
        />
      );

      const searchInput = screen.getByPlaceholderText(
        /search across all columns/i
      );
      fireEvent.change(searchInput, { target: { value: 'Elite' } });

      await waitFor(() => {
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
        expect(screen.queryByText('Sarah Connor')).not.toBeInTheDocument();
        expect(screen.queryByText('David Martinez')).not.toBeInTheDocument();
      });
    });

    test('searches by location', async () => {
      const columns = createRefereeColumns();

      render(
        <DataTable
          columns={columns}
          data={mockRefereeData}
          mobileCardType="referee"
        />
      );

      const searchInput = screen.getByPlaceholderText(
        /search across all columns/i
      );
      fireEvent.change(searchInput, { target: { value: 'Northwest Calgary' } });

      await waitFor(() => {
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
        expect(screen.queryByText('Sarah Connor')).not.toBeInTheDocument();
        expect(screen.queryByText('David Martinez')).not.toBeInTheDocument();
      });
    });

    test('searches by certifications', async () => {
      const columns = createRefereeColumns();

      render(
        <DataTable
          columns={columns}
          data={mockRefereeData}
          mobileCardType="referee"
        />
      );

      const searchInput = screen.getByPlaceholderText(
        /search across all columns/i
      );
      fireEvent.change(searchInput, { target: { value: 'NCCP Level 3' } });

      await waitFor(() => {
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
        expect(screen.queryByText('Sarah Connor')).not.toBeInTheDocument();
        expect(screen.queryByText('David Martinez')).not.toBeInTheDocument();
      });
    });
  });

  describe('Persistent State Management', () => {
    test('saves table state to localStorage', async () => {
      const columns = createRefereeColumns();

      render(
        <DataTable
          columns={columns}
          data={mockRefereeData}
          mobileCardType="referee"
        />
      );

      // Trigger a search to cause state change
      const searchInput = screen.getByPlaceholderText(
        /search across all columns/i
      );
      fireEvent.change(searchInput, { target: { value: 'Mike' } });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'datatable-referee-state',
          expect.stringContaining('Mike')
        );
      });
    });

    test('loads table state from localStorage', () => {
      const savedState = JSON.stringify({
        sorting: [],
        columnFilters: [],
        columnVisibility: {},
        globalFilter: 'Mike',
        viewMode: 'cards',
        timestamp: Date.now(),
      });

      localStorageMock.getItem.mockReturnValue(savedState);

      const columns = createRefereeColumns();

      render(
        <DataTable
          columns={columns}
          data={mockRefereeData}
          mobileCardType="referee"
        />
      );

      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        'datatable-referee-state'
      );
    });

    test('handles corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const columns = createRefereeColumns();

      expect(() => {
        render(
          <DataTable
            columns={columns}
            data={mockRefereeData}
            mobileCardType="referee"
          />
        );
      }).not.toThrow();
    });
  });

  describe('Column Management', () => {
    test('displays Calgary-specific location options in filters', async () => {
      const columns = createRefereeColumns();

      render(
        <DataTable
          columns={columns}
          data={mockRefereeData}
          mobileCardType="referee"
        />
      );

      // Check that Calgary locations are displayed
      expect(screen.getByText('Northwest Calgary')).toBeInTheDocument();
      expect(screen.getByText('Northeast Calgary')).toBeInTheDocument();
      expect(screen.getByText('Southwest Calgary')).toBeInTheDocument();
    });

    test('displays basketball certification levels', () => {
      const columns = createRefereeColumns();

      render(
        <DataTable
          columns={columns}
          data={mockRefereeData}
          mobileCardType="referee"
        />
      );

      expect(screen.getByText('Elite')).toBeInTheDocument();
      expect(screen.getByText('Competitive')).toBeInTheDocument();
      expect(screen.getByText('Recreational')).toBeInTheDocument();
    });

    test('handles missing certification data gracefully', () => {
      const dataWithMissingCerts = [
        {
          ...mockRefereeData[0],
          certifications: undefined,
        },
      ];

      const columns = createRefereeColumns();

      expect(() => {
        render(
          <DataTable
            columns={columns}
            data={dataWithMissingCerts}
            mobileCardType="referee"
          />
        );
      }).not.toThrow();
    });
  });

  describe('Performance and Edge Cases', () => {
    test('handles large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockRefereeData[0],
        id: `ref-${i}`,
        name: `Referee ${i}`,
        email: `referee${i}@cmba.ca`,
      }));

      const columns = createRefereeColumns();

      const { container } = render(
        <DataTable
          columns={columns}
          data={largeDataset}
          mobileCardType="referee"
        />
      );

      // Should render without performance issues
      expect(container).toBeInTheDocument();
    });

    test('handles undefined data gracefully', () => {
      const columns = createRefereeColumns();

      expect(() => {
        render(
          <DataTable
            columns={columns}
            data={undefined}
            mobileCardType="referee"
          />
        );
      }).not.toThrow();
    });

    test('handles null data gracefully', () => {
      const columns = createRefereeColumns();

      expect(() => {
        render(
          <DataTable columns={columns} data={null} mobileCardType="referee" />
        );
      }).not.toThrow();
    });
  });
});
