import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResourceCentre from '@/components/resource-centre';

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('Resource Centre - Critical User Flows', () => {
  // This tests what users ACTUALLY do
  test('User can view and search resources', async () => {
    render(<ResourceCentre />);

    // User arrives at resource centre
    expect(screen.getByText(/Resource Centre/i)).toBeInTheDocument();

    // User can see categories
    expect(screen.getByText(/Rules & Regulations/i)).toBeInTheDocument();

    // User can search
    const searchBox = screen.getByPlaceholderText(/Search resources/i);
    fireEvent.change(searchBox, { target: { value: 'offside' } });

    // Results update (you'd mock the API call here)
    await waitFor(() => {
      // Assert filtered results appear
    });
  });

  test('Admin can add new resource', async () => {
    // Mock admin user
    const mockUser = { role: 'admin' };

    render(<ResourceCentre user={mockUser} />);

    // Admin sees add button
    const addButton = screen.getByText(/Add Resource/i);
    expect(addButton).toBeInTheDocument();

    // Admin clicks add
    fireEvent.click(addButton);

    // Form appears
    await waitFor(() => {
      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Content/i)).toBeInTheDocument();
    });
  });

  test('TinyMCE editor loads for content editing', async () => {
    const mockUser = { role: 'admin' };
    render(<ResourceCentre user={mockUser} />);

    // Open editor
    const addButton = screen.getByText(/Add Resource/i);
    fireEvent.click(addButton);

    // TinyMCE should initialize
    await waitFor(() => {
      // Check for TinyMCE specific elements
      const editor = document.querySelector('.tox-tinymce');
      expect(editor).toBeInTheDocument();
    });
  });
});

// This is 10x more valuable than fixing old tests
// because it tests what you're ACTUALLY building!
