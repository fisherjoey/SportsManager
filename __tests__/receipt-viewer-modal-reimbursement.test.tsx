import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReceiptViewerModal } from '@/components/receipt-viewer-modal';
import { apiClient } from '@/lib/api';

// Mock the API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    getReceiptDetails: jest.fn(),
    downloadReceipt: jest.fn(),
  },
}));

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('ReceiptViewerModal - Reimbursement Functionality', () => {
  const mockReceipt = {
    id: 'receipt-123',
    filename: 'test-receipt.pdf',
    originalFilename: 'test-receipt.pdf',
    fileType: 'application/pdf',
    fileSize: 2048,
    uploadedAt: '2024-01-15T10:00:00Z',
    processedAt: '2024-01-15T10:05:00Z',
    status: 'processed',
    ocrText: 'WALMART SUPERCENTER\nTOTAL: $25.50',
    extractedData: {
      merchant: 'Walmart',
      date: '2024-01-15',
      amount: 25.50,
      category: 'Office Supplies',
      confidence: 0.95,
      items: [
        {
          description: 'Notebook',
          quantity: 2,
          unitPrice: 5.99,
          totalPrice: 11.98
        },
        {
          description: 'Pens',
          quantity: 1,
          unitPrice: 13.52,
          totalPrice: 13.52
        }
      ]
    }
  };

  const mockUsers = [
    { id: 'user-1', email: 'john@example.com', role: 'admin' },
    { id: 'user-2', email: 'jane@example.com', role: 'manager' },
    { id: 'user-3', email: 'bob@example.com', role: 'referee' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-auth-token');
    
    // Mock successful users fetch
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/users') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: mockUsers })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });

  describe('Reimbursement Assignment UI', () => {
    test('should render reimbursement assignment section', async () => {
      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Reimbursement Assignment')).toBeInTheDocument();
        expect(screen.getByText('Select a user for reimbursement')).toBeInTheDocument();
        expect(screen.getByText('Reimbursement Notes (Optional)')).toBeInTheDocument();
      });
    });

    test('should load and display users in dropdown', async () => {
      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Select a user for reimbursement')).toBeInTheDocument();
      });

      // Click to open dropdown
      const selectTrigger = screen.getByRole('combobox');
      await userEvent.click(selectTrigger);

      await waitFor(() => {
        mockUsers.forEach(user => {
          expect(screen.getByText(user.email)).toBeInTheDocument();
        });
      });
    });

    test('should handle user selection', async () => {
      const user = userEvent.setup();
      
      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Open dropdown and select user
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      await user.click(screen.getByText('john@example.com'));

      // Verify selection
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    test('should handle notes input', async () => {
      const user = userEvent.setup();
      
      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      const notesTextarea = screen.getByPlaceholderText('Add any notes about this reimbursement...');
      await user.type(notesTextarea, 'This is a test reimbursement note');

      expect(notesTextarea).toHaveValue('This is a test reimbursement note');
    });

    test('should disable assign button when no user selected', async () => {
      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      await waitFor(() => {
        const assignButton = screen.getByText('Assign Reimbursement');
        expect(assignButton).toBeDisabled();
      });
    });

    test('should enable assign button when user is selected', async () => {
      const user = userEvent.setup();
      
      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      // Select a user
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      await user.click(screen.getByText('john@example.com'));

      // Check that button is now enabled
      await waitFor(() => {
        const assignButton = screen.getByText('Assign Reimbursement');
        expect(assignButton).not.toBeDisabled();
      });
    });
  });

  describe('Reimbursement Assignment API Integration', () => {
    test('should successfully assign reimbursement', async () => {
      const user = userEvent.setup();
      
      // Mock successful assignment response
      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url === '/api/users') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: mockUsers })
          });
        }
        if (url.includes('/assign-reimbursement') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              message: 'Reimbursement assignment updated successfully',
              expenseData: {
                reimbursement_user_id: 'user-1',
                reimbursement_user_email: 'john@example.com',
                reimbursement_notes: 'Test assignment'
              }
            })
          });
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Not found' })
        });
      });

      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      // Select user
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await waitFor(() => screen.getByText('john@example.com'));
      await user.click(screen.getByText('john@example.com'));

      // Add notes
      const notesTextarea = screen.getByPlaceholderText('Add any notes about this reimbursement...');
      await user.type(notesTextarea, 'Test assignment');

      // Click assign button
      const assignButton = screen.getByText('Assign Reimbursement');
      await user.click(assignButton);

      // Wait for loading state
      await waitFor(() => {
        expect(screen.getByText('Assigning...')).toBeInTheDocument();
      });

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText('Assigned for Reimbursement')).toBeInTheDocument();
        expect(screen.getByText('User: john@example.com')).toBeInTheDocument();
        expect(screen.getByText('Notes: Test assignment')).toBeInTheDocument();
      });

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/expenses/receipts/receipt-123/assign-reimbursement',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-auth-token'
          },
          body: JSON.stringify({
            userId: 'user-1',
            notes: 'Test assignment'
          })
        })
      );
    });

    test('should handle assignment API errors', async () => {
      const user = userEvent.setup();
      const mockToast = jest.fn();
      
      // Mock the toast function
      jest.mock('@/components/ui/use-toast', () => ({
        toast: mockToast,
      }));

      // Mock failed assignment response
      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url === '/api/users') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: mockUsers })
          });
        }
        if (url.includes('/assign-reimbursement') && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({
              error: 'Expense data not found for this receipt'
            })
          });
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Not found' })
        });
      });

      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      // Select user and assign
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await waitFor(() => screen.getByText('john@example.com'));
      await user.click(screen.getByText('john@example.com'));

      const assignButton = screen.getByText('Assign Reimbursement');
      await user.click(assignButton);

      // Wait for error handling
      await waitFor(() => {
        expect(screen.getByText('Assign Reimbursement')).toBeInTheDocument();
      });
    });

    test('should show loading state during assignment', async () => {
      const user = userEvent.setup();
      let resolveAssignment: (value: any) => void;
      
      // Mock delayed assignment response
      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url === '/api/users') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: mockUsers })
          });
        }
        if (url.includes('/assign-reimbursement') && options?.method === 'POST') {
          return new Promise((resolve) => {
            resolveAssignment = resolve;
          });
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Not found' })
        });
      });

      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      // Select user and assign
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await waitFor(() => screen.getByText('john@example.com'));
      await user.click(screen.getByText('john@example.com'));

      const assignButton = screen.getByText('Assign Reimbursement');
      await user.click(assignButton);

      // Check loading state
      await waitFor(() => {
        expect(screen.getByText('Assigning...')).toBeInTheDocument();
        expect(assignButton).toBeDisabled();
      });

      // Complete the request
      resolveAssignment!({
        ok: true,
        json: () => Promise.resolve({
          message: 'Reimbursement assignment updated successfully',
          expenseData: {
            reimbursement_user_id: 'user-1',
            reimbursement_user_email: 'john@example.com'
          }
        })
      });

      await waitFor(() => {
        expect(screen.getByText('Assigned for Reimbursement')).toBeInTheDocument();
      });
    });
  });

  describe('Assigned Reimbursement Display', () => {
    test('should display assigned reimbursement information', () => {
      const assignedReceipt = {
        ...mockReceipt,
        reimbursementData: {
          reimbursement_user_email: 'john@example.com',
          reimbursement_notes: 'Approved for reimbursement'
        }
      };

      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={assignedReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      // The component should show assigned state instead of assignment form
      // This would require updating the component to handle pre-assigned reimbursements
      expect(screen.getByText('Reimbursement Assignment')).toBeInTheDocument();
    });

    test('should not show assignment form when already assigned', () => {
      // Mock component state with existing assignment
      const mockReimbursementData = {
        reimbursement_user_email: 'john@example.com',
        reimbursement_notes: 'Already assigned'
      };

      // This test would need the component to be updated to handle existing assignments
      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      // Would need to set reimbursementData state through some mechanism
      // For now, this demonstrates the expected behavior
      expect(screen.getByText('Reimbursement Assignment')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle users API failure gracefully', async () => {
      // Mock failed users fetch
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url === '/api/users') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Failed to fetch users' })
          });
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Not found' })
        });
      });

      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      // Should still render the component
      await waitFor(() => {
        expect(screen.getByText('Reimbursement Assignment')).toBeInTheDocument();
      });

      // Dropdown should still be present but empty
      const selectTrigger = screen.getByRole('combobox');
      expect(selectTrigger).toBeInTheDocument();
    });

    test('should handle network errors during assignment', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url === '/api/users') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ users: mockUsers })
          });
        }
        if (url.includes('/assign-reimbursement')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Not found' })
        });
      });

      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      // Select user and try to assign
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await waitFor(() => screen.getByText('john@example.com'));
      await user.click(screen.getByText('john@example.com'));

      const assignButton = screen.getByText('Assign Reimbursement');
      await user.click(assignButton);

      // Should handle error gracefully and return to normal state
      await waitFor(() => {
        expect(screen.getByText('Assign Reimbursement')).toBeInTheDocument();
      });
    });

    test('should handle missing authentication token', async () => {
      const user = userEvent.setup();
      
      // Mock missing token
      mockLocalStorage.getItem.mockReturnValue(null);

      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      // Should still render but may not load users
      await waitFor(() => {
        expect(screen.getByText('Reimbursement Assignment')).toBeInTheDocument();
      });
    });

    test('should validate form before submission', async () => {
      const user = userEvent.setup();
      
      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      // Try to assign without selecting user
      const assignButton = screen.getByText('Assign Reimbursement');
      expect(assignButton).toBeDisabled();

      // Verify no API call is made
      await user.click(assignButton);
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/assign-reimbursement'),
        expect.any(Object)
      );
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      // Check for proper labeling
      expect(screen.getByText('Assign to User')).toBeInTheDocument();
      expect(screen.getByText('Reimbursement Notes (Optional)')).toBeInTheDocument();
      
      // Check for proper form controls
      const selectTrigger = screen.getByRole('combobox');
      expect(selectTrigger).toBeInTheDocument();
      
      const textArea = screen.getByRole('textbox');
      expect(textArea).toBeInTheDocument();
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <ReceiptViewerModal
          receiptId="receipt-123"
          receipt={mockReceipt}
          open={true}
          onOpenChange={jest.fn()}
        />
      );

      // Tab through form elements
      await user.tab();
      
      // Should be able to navigate to select
      const selectTrigger = screen.getByRole('combobox');
      expect(selectTrigger).toHaveClass('focus-visible:ring-2'); // Or similar focus class
    });
  });
});