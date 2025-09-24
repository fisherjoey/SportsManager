/**
 * Frontend Component Tests for TinyMCE Resource Editor
 * 
 * These tests will FAIL initially (Red Phase) - this is expected in TDD!
 * We'll implement the components to make them pass.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Mock TinyMCE
const mockTinyMCE = {
  init: jest.fn(),
  remove: jest.fn(),
  get: jest.fn(() => ({
    getContent: jest.fn(() => '<p>Mock content</p>'),
    setContent: jest.fn(),
    uploadImages: jest.fn(() => Promise.resolve()),
    editorUpload: {
      blobCache: {
        create: jest.fn(),
        add: jest.fn()
      }
    }
  }))
};

jest.mock('@tinymce/tinymce-react', () => ({
  Editor: jest.fn(({ onEditorChange, value, onInit }) => {
    React.useEffect(() => {
      if (onInit) {
        onInit(null, mockTinyMCE.get());
      }
    }, [onInit]);
    
    return (
      <div data-testid="tinymce-editor">
        <textarea
          data-testid="editor-textarea"
          value={value}
          onChange={(e) => onEditorChange && onEditorChange(e.target.value)}
        />
      </div>
    );
  })
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light' })
}));

// Mock fetch for file uploads
global.fetch = jest.fn();

describe('ResourceEditor Component', () => {
  let mockOnSave, mockOnFileUpload, user;

  beforeEach(() => {
    mockOnSave = jest.fn();
    mockOnFileUpload = jest.fn();
    user = userEvent.setup();
    
    // Reset mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should render editor form with all required fields', async () => {
    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    render(
      <ResourceEditor
        onSave={mockOnSave}
        onFileUpload={mockOnFileUpload}
      />
    );

    // Check form fields exist
    expect(screen.getByPlaceholderText('Resource Title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Brief description...')).toBeInTheDocument();
    expect(screen.getByTestId('tinymce-editor')).toBeInTheDocument();
    expect(screen.getByText('Save Resource')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    
    // Check dropdowns
    expect(screen.getByDisplayValue('Select Category')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Content Type')).toBeInTheDocument();
  });

  test('should initialize TinyMCE with correct configuration', async () => {
    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    render(<ResourceEditor onSave={mockOnSave} />);

    await waitFor(() => {
      expect(mockTinyMCE.init).toHaveBeenCalledWith(
        expect.objectContaining({
          height: 500,
          menubar: false,
          plugins: expect.arrayContaining([
            'lists', 'link', 'image', 'preview', 'code', 'fullscreen',
            'media', 'table', 'wordcount', 'paste'
          ]),
          toolbar: expect.stringContaining('image media'),
          skin: 'oxide', // Light theme
          branding: false,
          promotion: false,
          file_picker_callback: expect.any(Function)
        })
      );
    });
  });

  test('should adapt TinyMCE theme based on system theme', async () => {
    // Mock dark theme
    jest.doMock('next-themes', () => ({
      useTheme: () => ({ theme: 'dark', resolvedTheme: 'dark' })
    }));

    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    render(<ResourceEditor onSave={mockOnSave} />);

    await waitFor(() => {
      expect(mockTinyMCE.init).toHaveBeenCalledWith(
        expect.objectContaining({
          skin: 'oxide-dark',
          content_css: 'dark'
        })
      );
    });
  });

  test('should handle content changes in TinyMCE', async () => {
    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    render(<ResourceEditor onSave={mockOnSave} />);

    const editor = screen.getByTestId('editor-textarea');
    await user.type(editor, '<h1>New Content</h1><p>Test content</p>');

    // Content should be updated in component state
    expect(editor).toHaveValue('<h1>New Content</h1><p>Test content</p>');
  });

  test('should validate form before saving', async () => {
    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    render(<ResourceEditor onSave={mockOnSave} />);

    // Try to save without required fields
    const saveButton = screen.getByText('Save Resource');
    await user.click(saveButton);

    // Should show validation errors
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();
    expect(screen.getByText('Content cannot be empty')).toBeInTheDocument();
    
    // Should not call onSave
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  test('should save content with all form data', async () => {
    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    render(<ResourceEditor onSave={mockOnSave} />);

    // Fill out form
    await user.type(screen.getByPlaceholderText('Resource Title'), 'Training Manual');
    await user.type(screen.getByPlaceholderText('Brief description...'), 'Comprehensive training guide');
    await user.selectOptions(screen.getByDisplayValue('Select Category'), 'Referee Resources');
    await user.selectOptions(screen.getByDisplayValue('Content Type'), 'document');
    
    const editor = screen.getByTestId('editor-textarea');
    await user.type(editor, '<h1>Training Overview</h1><p>Important information</p>');

    // Save
    await user.click(screen.getByText('Save Resource'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        title: 'Training Manual',
        description: 'Comprehensive training guide',
        category: 'Referee Resources',
        type: 'document',
        content: '<h1>Training Overview</h1><p>Important information</p>',
        slug: 'training-manual'
      });
    });
  });

  test('should handle file upload via TinyMCE file picker', async () => {
    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    // Mock successful upload
    mockOnFileUpload.mockResolvedValue({
      file_url: '/uploads/test-image.jpg',
      file_name: 'test-image.jpg'
    });

    render(<ResourceEditor onFileUpload={mockOnFileUpload} />);

    // Get the file picker callback from TinyMCE init
    const filePickerCallback = mockTinyMCE.init.mock.calls[0][0].file_picker_callback;
    
    // Create mock file and callback
    const mockCallback = jest.fn();
    const mockFile = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' });
    
    // Simulate file selection
    Object.defineProperty(document.createElement('input'), 'files', {
      value: [mockFile],
      writable: false,
    });

    // Trigger file picker
    filePickerCallback(mockCallback, '', { filetype: 'image' });

    // Wait for upload to complete
    await waitFor(() => {
      expect(mockOnFileUpload).toHaveBeenCalledWith(mockFile);
      expect(mockCallback).toHaveBeenCalledWith('/uploads/test-image.jpg', {
        title: 'test-image.jpg'
      });
    });
  });

  test('should show loading state during save', async () => {
    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    // Mock slow save
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(<ResourceEditor onSave={mockOnSave} />);

    // Fill required fields
    await user.type(screen.getByPlaceholderText('Resource Title'), 'Test');
    await user.selectOptions(screen.getByDisplayValue('Select Category'), 'General');
    const editor = screen.getByTestId('editor-textarea');
    await user.type(editor, '<p>Content</p>');

    // Start save
    await user.click(screen.getByText('Save Resource'));

    // Check loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Saving...')).toBeDisabled();
  });

  test('should show error state on save failure', async () => {
    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    // Mock save failure
    mockOnSave.mockRejectedValue(new Error('Server error'));

    render(<ResourceEditor onSave={mockOnSave} />);

    // Fill and save
    await user.type(screen.getByPlaceholderText('Resource Title'), 'Test');
    await user.selectOptions(screen.getByDisplayValue('Select Category'), 'General');
    const editor = screen.getByTestId('editor-textarea');
    await user.type(editor, '<p>Content</p>');
    await user.click(screen.getByText('Save Resource'));

    await waitFor(() => {
      expect(screen.getByText('Error saving resource. Please try again.')).toBeInTheDocument();
      expect(screen.getByText('Save Resource')).toBeInTheDocument(); // Button restored
    });
  });

  test('should open preview in new window', async () => {
    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    // Mock window.open
    const mockOpen = jest.fn();
    const mockWrite = jest.fn();
    const mockClose = jest.fn();
    
    global.window.open = mockOpen.mockReturnValue({
      document: { write: mockWrite, close: mockClose }
    });

    render(<ResourceEditor onSave={mockOnSave} />);

    // Add content
    const editor = screen.getByTestId('editor-textarea');
    await user.type(editor, '<h1>Preview Test</h1><p>Preview content</p>');

    // Click preview
    await user.click(screen.getByText('Preview'));

    expect(mockOpen).toHaveBeenCalledWith('', '_blank');
    expect(mockWrite).toHaveBeenCalledWith(
      expect.stringContaining('<h1>Preview Test</h1><p>Preview content</p>')
    );
    expect(mockWrite).toHaveBeenCalledWith(
      expect.stringContaining('<!DOCTYPE html>')
    );
    expect(mockClose).toHaveBeenCalled();
  });

  test('should handle file upload errors gracefully', async () => {
    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    // Mock upload failure
    mockOnFileUpload.mockRejectedValue(new Error('Upload failed'));

    render(<ResourceEditor onFileUpload={mockOnFileUpload} />);

    // Simulate file upload error
    const filePickerCallback = mockTinyMCE.init.mock.calls[0][0].file_picker_callback;
    const mockCallback = jest.fn();
    
    filePickerCallback(mockCallback, '', { filetype: 'image' });

    await waitFor(() => {
      expect(screen.getByText('File upload failed. Please try again.')).toBeInTheDocument();
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  test('should support editing existing content', async () => {
    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    const existingContent = {
      id: 1,
      title: 'Existing Document',
      description: 'Existing description',
      category: 'Training',
      type: 'document',
      content: '<h1>Existing Content</h1>',
      slug: 'existing-document'
    };

    render(
      <ResourceEditor 
        onSave={mockOnSave}
        initialData={existingContent}
        mode="edit"
      />
    );

    // Form should be pre-populated
    expect(screen.getByDisplayValue('Existing Document')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Training')).toBeInTheDocument();
    expect(screen.getByDisplayValue('document')).toBeInTheDocument();
    
    const editor = screen.getByTestId('editor-textarea');
    expect(editor).toHaveValue('<h1>Existing Content</h1>');
    
    // Save button should say "Update Resource"
    expect(screen.getByText('Update Resource')).toBeInTheDocument();
  });

  test('should handle drag and drop file upload', async () => {
    const { ResourceEditor } = await import('../../components/resource-centre/ResourceEditor');
    
    mockOnFileUpload.mockResolvedValue({
      file_url: '/uploads/dropped-file.png'
    });

    render(<ResourceEditor onFileUpload={mockOnFileUpload} />);

    const dropZone = screen.getByText('Drop files here or click to upload').parentElement;
    
    // Create mock file
    const mockFile = new File(['test'], 'dropped-file.png', { type: 'image/png' });
    
    // Simulate drag and drop
    fireEvent.dragOver(dropZone);
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [mockFile] }
    });

    await waitFor(() => {
      expect(mockOnFileUpload).toHaveBeenCalledWith(mockFile);
    });
  });
});