/**
 * Frontend Component Tests for Resource Manager
 * 
 * These tests will FAIL initially (Red Phase) - this is expected in TDD!
 * We'll implement the components to make them pass.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Mock fetch
global.fetch = jest.fn();

describe('ResourceManager Component', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  const mockContentItems = [
    {
      id: 1,
      title: 'Referee Training Manual',
      description: 'Complete training guide for new referees',
      type: 'document',
      category: { id: 1, name: 'Training Materials' },
      status: 'published',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      author: { id: 1, name: 'John Admin' }
    },
    {
      id: 2,
      title: 'Game Day Procedures',
      description: 'Step-by-step game day procedures',
      type: 'document',
      category: { id: 2, name: 'Procedures' },
      status: 'draft',
      created_at: '2024-01-14T09:00:00Z',
      updated_at: '2024-01-14T09:00:00Z',
      author: { id: 1, name: 'John Admin' }
    }
  ];

  const mockCategories = [
    { id: 1, name: 'Training Materials', slug: 'training-materials' },
    { id: 2, name: 'Procedures', slug: 'procedures' },
    { id: 3, name: 'Member Services', slug: 'member-services' }
  ];

  test('should render resource list with content items', async () => {
    // Mock API responses
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: mockContentItems,
          pagination: { page: 1, limit: 10, total: 2, pages: 1 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

    const { ResourceManager } = await import('../../components/resource-centre/ResourceManager');
    
    render(<ResourceManager />);

    await waitFor(() => {
      expect(screen.getByText('Referee Training Manual')).toBeInTheDocument();
      expect(screen.getByText('Game Day Procedures')).toBeInTheDocument();
      expect(screen.getByText('Complete training guide for new referees')).toBeInTheDocument();
    });

    // Check status badges
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();

    // Check category badges
    expect(screen.getByText('Training Materials')).toBeInTheDocument();
    expect(screen.getByText('Procedures')).toBeInTheDocument();
  });

  test('should show loading state while fetching data', async () => {
    // Mock slow API response
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ items: [], pagination: {} })
      }), 100))
    );

    const { ResourceManager } = await import('../../components/resource-centre/ResourceManager');
    
    render(<ResourceManager />);

    expect(screen.getByText('Loading resources...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { ResourceManager } = await import('../../components/resource-centre/ResourceManager');
    
    render(<ResourceManager />);

    await waitFor(() => {
      expect(screen.getByText('Error loading resources. Please try again.')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  test('should filter resources by category', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: mockContentItems,
          pagination: { page: 1, limit: 10, total: 2, pages: 1 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      })
      // Second call for filtered results
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [mockContentItems[0]], // Only training material
          pagination: { page: 1, limit: 10, total: 1, pages: 1 }
        })
      });

    const { ResourceManager } = await import('../../components/resource-centre/ResourceManager');
    
    render(<ResourceManager />);

    await waitFor(() => {
      expect(screen.getByText('Referee Training Manual')).toBeInTheDocument();
    });

    // Filter by category
    const categoryFilter = screen.getByLabelText('Filter by category');
    await user.selectOptions(categoryFilter, 'Training Materials');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/content/items?category_id=1'),
        expect.any(Object)
      );
    });
  });

  test('should search resources', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: mockContentItems,
          pagination: { page: 1, limit: 10, total: 2, pages: 1 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      })
      // Search results
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [mockContentItems[0]],
          pagination: { page: 1, limit: 10, total: 1, pages: 1 }
        })
      });

    const { ResourceManager } = await import('../../components/resource-centre/ResourceManager');
    
    render(<ResourceManager />);

    await waitFor(() => {
      expect(screen.getByText('Referee Training Manual')).toBeInTheDocument();
    });

    // Search
    const searchInput = screen.getByPlaceholderText('Search resources...');
    await user.type(searchInput, 'referee');
    
    // Debounced search should trigger after typing
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/content/items?search=referee'),
        expect.any(Object)
      );
    }, { timeout: 1000 });
  });

  test('should handle pagination', async () => {
    const paginatedResponse = {
      items: mockContentItems,
      pagination: { page: 1, limit: 10, total: 25, pages: 3 }
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => paginatedResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      })
      // Page 2 response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [mockContentItems[1]],
          pagination: { page: 2, limit: 10, total: 25, pages: 3 }
        })
      });

    const { ResourceManager } = await import('../../components/resource-centre/ResourceManager');
    
    render(<ResourceManager />);

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    // Click next page
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/content/items?page=2'),
        expect.any(Object)
      );
    });
  });

  test('should open create new resource modal', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

    const { ResourceManager } = await import('../../components/resource-centre/ResourceManager');
    
    render(<ResourceManager />);

    await waitFor(() => {
      const newResourceButton = screen.getByText('New Resource');
      expect(newResourceButton).toBeInTheDocument();
    });

    // Click new resource button
    const newResourceButton = screen.getByText('New Resource');
    await user.click(newResourceButton);

    // Should open editor modal
    expect(screen.getByText('Create New Resource')).toBeInTheDocument();
    expect(screen.getByTestId('resource-editor')).toBeInTheDocument();
  });

  test('should edit existing resource', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: mockContentItems,
          pagination: { page: 1, limit: 10, total: 2, pages: 1 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      })
      // Full content for editing
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockContentItems[0],
          content: '<h1>Training Content</h1><p>Full content here</p>'
        })
      });

    const { ResourceManager } = await import('../../components/resource-centre/ResourceManager');
    
    render(<ResourceManager />);

    await waitFor(() => {
      expect(screen.getByText('Referee Training Manual')).toBeInTheDocument();
    });

    // Click edit button
    const editButtons = screen.getAllByLabelText('Edit resource');
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Resource')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Referee Training Manual')).toBeInTheDocument();
    });
  });

  test('should delete resource with confirmation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: mockContentItems,
          pagination: { page: 1, limit: 10, total: 2, pages: 1 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      })
      // Delete response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      // Refresh after delete
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [mockContentItems[1]], // Item removed
          pagination: { page: 1, limit: 10, total: 1, pages: 1 }
        })
      });

    const { ResourceManager } = await import('../../components/resource-centre/ResourceManager');
    
    render(<ResourceManager />);

    await waitFor(() => {
      expect(screen.getByText('Referee Training Manual')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByLabelText('Delete resource');
    await user.click(deleteButtons[0]);

    // Confirm deletion
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete "Referee Training Manual"?')).toBeInTheDocument();
    
    const confirmButton = screen.getByText('Delete');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/content/items/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  test('should show resource statistics', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: mockContentItems,
          pagination: { page: 1, limit: 10, total: 2, pages: 1 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

    const { ResourceManager } = await import('../../components/resource-centre/ResourceManager');
    
    render(<ResourceManager />);

    await waitFor(() => {
      // Should show summary stats
      expect(screen.getByText('Total Resources: 2')).toBeInTheDocument();
      expect(screen.getByText('Published: 1')).toBeInTheDocument();
      expect(screen.getByText('Drafts: 1')).toBeInTheDocument();
    });
  });

  test('should bulk select and delete resources', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: mockContentItems,
          pagination: { page: 1, limit: 10, total: 2, pages: 1 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      })
      // Bulk delete response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: 2 })
      })
      // Refresh after bulk delete
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 }
        })
      });

    const { ResourceManager } = await import('../../components/resource-centre/ResourceManager');
    
    render(<ResourceManager />);

    await waitFor(() => {
      expect(screen.getByText('Referee Training Manual')).toBeInTheDocument();
    });

    // Select multiple resources
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // Select first item
    await user.click(checkboxes[1]); // Select second item

    // Bulk actions should appear
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByText('Delete Selected')).toBeInTheDocument();

    // Click bulk delete
    await user.click(screen.getByText('Delete Selected'));

    // Confirm bulk deletion
    expect(screen.getByText('Delete 2 resources?')).toBeInTheDocument();
    await user.click(screen.getByText('Delete All'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/content/items/bulk-delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ids: [1, 2] })
        })
      );
    });
  });

  test('should export resources list', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: mockContentItems,
          pagination: { page: 1, limit: 10, total: 2, pages: 1 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      });

    // Mock URL.createObjectURL and download
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn()
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

    const { ResourceManager } = await import('../../components/resource-centre/ResourceManager');
    
    render(<ResourceManager />);

    await waitFor(() => {
      expect(screen.getByText('Referee Training Manual')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByText('Export');
    await user.click(exportButton);

    // Check export options
    expect(screen.getByText('Export to CSV')).toBeInTheDocument();
    expect(screen.getByText('Export to JSON')).toBeInTheDocument();

    // Export to CSV
    await user.click(screen.getByText('Export to CSV'));

    expect(mockLink.download).toBe('resources.csv');
    expect(mockLink.click).toHaveBeenCalled();
  });
});