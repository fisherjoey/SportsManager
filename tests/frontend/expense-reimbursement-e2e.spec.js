import { test, expect } from '@playwright/test';

test.describe('Expense Reimbursement End-to-End Workflow', () => {
  let adminUser, regularUser;
  let testReceipt;

  test.beforeAll(async ({ request }) => {
    // Create test users
    const adminResponse = await request.post('/api/auth/register', {
      data: {
        email: 'e2e-admin@example.com',
        password: 'testpassword123',
        role: 'admin'
      }
    });
    adminUser = await adminResponse.json();

    const userResponse = await request.post('/api/auth/register', {
      data: {
        email: 'e2e-user@example.com',
        password: 'testpassword123',
        role: 'referee'
      }
    });
    regularUser = await userResponse.json();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login');
  });

  test.afterAll(async ({ request }) => {
    // Clean up test users
    await request.delete(`/api/users/${adminUser.id}`);
    await request.delete(`/api/users/${regularUser.id}`);
  });

  test('Complete reimbursement workflow from upload to payment', async ({ page, request }) => {
    // Step 1: Login as regular user and upload receipt
    await page.fill('[data-testid="email-input"]', 'e2e-user@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Navigate to expense management
    await page.click('[data-testid="expenses-nav"]');
    await expect(page).toHaveURL('/expenses');

    // Upload a receipt
    await page.click('[data-testid="upload-receipt-button"]');
    
    // Mock file upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-receipt.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content')
    });

    await page.fill('[data-testid="receipt-description"]', 'Business lunch for client meeting');
    await page.selectOption('[data-testid="category-select"]', { label: 'Food & Beverages' });
    
    await page.click('[data-testid="upload-submit-button"]');
    
    // Wait for upload success
    await expect(page.locator('[data-testid="upload-success-message"]')).toBeVisible();
    
    // Get receipt ID from success message or table
    const receiptRow = page.locator('[data-testid="receipt-row"]').first();
    await expect(receiptRow).toBeVisible();
    
    const receiptId = await receiptRow.getAttribute('data-receipt-id');
    testReceipt = { id: receiptId };

    // Verify receipt appears in list
    await expect(receiptRow.locator('[data-testid="receipt-filename"]')).toContainText('test-receipt.pdf');
    await expect(receiptRow.locator('[data-testid="receipt-status"]')).toContainText('Processed');

    // Step 2: User logs out, admin logs in
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Admin login
    await page.fill('[data-testid="email-input"]', 'e2e-admin@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    // Wait for admin dashboard
    await expect(page.locator('h1')).toContainText('Admin Dashboard');

    // Step 3: Admin approves the expense
    await page.click('[data-testid="expenses-nav"]');
    await page.click('[data-testid="expense-approvals-tab"]');

    // Find the uploaded receipt
    const pendingReceiptRow = page.locator(`[data-receipt-id="${receiptId}"]`);
    await expect(pendingReceiptRow).toBeVisible();

    // Click to view receipt details
    await pendingReceiptRow.click();
    
    // Approve the expense
    await page.click('[data-testid="approve-expense-button"]');
    await page.fill('[data-testid="approval-notes"]', 'Approved for business lunch expense');
    await page.fill('[data-testid="approved-amount"]', '45.50');
    await page.click('[data-testid="confirm-approval-button"]');

    // Wait for approval success
    await expect(page.locator('[data-testid="approval-success-message"]')).toBeVisible();

    // Step 4: Admin assigns reimbursement
    await page.click('[data-testid="reimbursements-tab"]');
    
    // Find the approved expense in reimbursements section
    const expenseForReimbursement = page.locator(`[data-expense-id="${receiptId}"]`);
    await expect(expenseForReimbursement).toBeVisible();

    // Click to assign reimbursement
    await expenseForReimbursement.click();
    
    // Wait for reimbursement modal
    await expect(page.locator('[data-testid="reimbursement-assignment-modal"]')).toBeVisible();

    // Select user for reimbursement
    await page.click('[data-testid="reimbursement-user-select"]');
    await page.click(`[data-testid="user-option-${regularUser.id}"]`);
    
    // Add reimbursement notes
    await page.fill('[data-testid="reimbursement-notes"]', 'Reimbursing employee for approved business lunch');
    
    // Assign reimbursement
    await page.click('[data-testid="assign-reimbursement-button"]');
    
    // Wait for assignment success
    await expect(page.locator('[data-testid="assignment-success-message"]')).toBeVisible();

    // Verify assignment appears in UI
    await expect(page.locator('[data-testid="assigned-user-email"]')).toContainText('e2e-user@example.com');

    // Step 5: Admin creates reimbursement entry
    await page.click('[data-testid="create-reimbursement-button"]');
    
    // Fill reimbursement details
    await page.selectOption('[data-testid="payment-method-select"]', 'direct_deposit');
    await page.fill('[data-testid="scheduled-pay-date"]', '2024-03-15');
    await page.selectOption('[data-testid="pay-period-select"]', '2024-03');
    await page.fill('[data-testid="reimbursement-notes"]', 'Scheduled for March pay period');
    
    await page.click('[data-testid="create-reimbursement-submit-button"]');
    
    // Wait for creation success
    await expect(page.locator('[data-testid="reimbursement-created-message"]')).toBeVisible();

    // Step 6: Verify reimbursement appears in reimbursements list
    await page.click('[data-testid="reimbursements-list-tab"]');
    
    const reimbursementRow = page.locator('[data-testid="reimbursement-row"]').first();
    await expect(reimbursementRow).toBeVisible();
    await expect(reimbursementRow.locator('[data-testid="reimbursement-amount"]')).toContainText('$45.50');
    await expect(reimbursementRow.locator('[data-testid="reimbursement-status"]')).toContainText('Scheduled');

    // Step 7: Admin processes payment
    await reimbursementRow.click();
    await expect(page.locator('[data-testid="reimbursement-details-modal"]')).toBeVisible();

    await page.click('[data-testid="mark-as-paid-button"]');
    
    // Fill payment details
    await page.fill('[data-testid="paid-amount"]', '45.50');
    await page.fill('[data-testid="payment-reference"]', 'DD-2024-03-15-001');
    await page.fill('[data-testid="paid-date"]', '2024-03-15');
    await page.fill('[data-testid="payment-notes"]', 'Direct deposit processed successfully');
    
    await page.click('[data-testid="confirm-payment-button"]');
    
    // Wait for payment success
    await expect(page.locator('[data-testid="payment-success-message"]')).toBeVisible();

    // Verify status updated to paid
    await expect(reimbursementRow.locator('[data-testid="reimbursement-status"]')).toContainText('Paid');

    // Step 8: User logs back in to view their earnings
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // User login
    await page.fill('[data-testid="email-input"]', 'e2e-user@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    // Navigate to earnings/pay section
    await page.click('[data-testid="my-earnings-nav"]');
    
    // Verify reimbursement appears in user's earnings
    const earningRow = page.locator('[data-testid="earning-row"]').first();
    await expect(earningRow).toBeVisible();
    await expect(earningRow.locator('[data-testid="earning-type"]')).toContainText('Reimbursement');
    await expect(earningRow.locator('[data-testid="earning-amount"]')).toContainText('$45.50');
    await expect(earningRow.locator('[data-testid="earning-status"]')).toContainText('Paid');
    await expect(earningRow.locator('[data-testid="earning-description"]')).toContainText('Business lunch');
  });

  test('Error handling: User cannot assign reimbursements', async ({ page }) => {
    // Login as regular user
    await page.fill('[data-testid="email-input"]', 'e2e-user@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    // Navigate to expenses
    await page.click('[data-testid="expenses-nav"]');

    // Reimbursement assignment options should not be visible
    await expect(page.locator('[data-testid="assign-reimbursement-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="reimbursements-tab"]')).not.toBeVisible();
  });

  test('Cross-user reimbursement assignment workflow', async ({ page, request }) => {
    // Create additional user for cross-assignment
    const managerResponse = await request.post('/api/auth/register', {
      data: {
        email: 'e2e-manager@example.com',
        password: 'testpassword123',
        role: 'manager'
      }
    });
    const managerUser = await managerResponse.json();

    // Login as admin
    await page.fill('[data-testid="email-input"]', 'e2e-admin@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    // Create a new expense entry for testing
    await page.click('[data-testid="expenses-nav"]');
    await page.click('[data-testid="add-expense-manually-button"]');
    
    // Fill expense details
    await page.fill('[data-testid="vendor-name"]', 'Cross Assignment Test Vendor');
    await page.fill('[data-testid="expense-amount"]', '125.00');
    await page.fill('[data-testid="expense-date"]', '2024-03-01');
    await page.selectOption('[data-testid="expense-submitter"]', regularUser.id);
    await page.fill('[data-testid="expense-description"]', 'Employee expense, manager gets reimbursement');
    
    await page.click('[data-testid="create-expense-button"]');
    
    // Auto-approve the expense
    await page.click('[data-testid="auto-approve-checkbox"]');
    await page.click('[data-testid="confirm-create-button"]');

    // Wait for success
    await expect(page.locator('[data-testid="expense-created-message"]')).toBeVisible();

    // Navigate to reimbursements
    await page.click('[data-testid="reimbursements-tab"]');
    
    // Find the new expense
    const newExpenseRow = page.locator('[data-testid="expense-row"]').last();
    await newExpenseRow.click();

    // Assign reimbursement to manager (different from submitter)
    await page.click('[data-testid="reimbursement-user-select"]');
    await page.click(`[data-testid="user-option-${managerUser.id}"]`);
    
    await page.fill('[data-testid="reimbursement-notes"]', 'Manager paid for employee expense');
    await page.click('[data-testid="assign-reimbursement-button"]');

    // Verify assignment to manager
    await expect(page.locator('[data-testid="assigned-user-email"]')).toContainText('e2e-manager@example.com');

    // Create and process reimbursement
    await page.click('[data-testid="create-reimbursement-button"]');
    await page.click('[data-testid="create-reimbursement-submit-button"]');
    
    await expect(page.locator('[data-testid="reimbursement-created-message"]')).toBeVisible();

    // Verify manager gets the earning, not the original submitter
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Login as manager
    await page.fill('[data-testid="email-input"]', 'e2e-manager@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    await page.click('[data-testid="my-earnings-nav"]');
    
    // Manager should see the reimbursement
    const managerEarning = page.locator('[data-testid="earning-row"]').first();
    await expect(managerEarning).toBeVisible();
    await expect(managerEarning.locator('[data-testid="earning-amount"]')).toContainText('$125.00');

    // Login as regular user and verify they don't see this earning
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    await page.fill('[data-testid="email-input"]', 'e2e-user@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    await page.click('[data-testid="my-earnings-nav"]');
    
    // User should not see the manager's reimbursement
    const userEarnings = page.locator('[data-testid="earning-row"]');
    await expect(userEarnings.filter({ hasText: '$125.00' })).toHaveCount(0);

    // Clean up
    await request.delete(`/api/users/${managerUser.id}`);
  });

  test('Reimbursement filtering and search functionality', async ({ page }) => {
    // Login as admin
    await page.fill('[data-testid="email-input"]', 'e2e-admin@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    await page.click('[data-testid="expenses-nav"]');
    await page.click('[data-testid="reimbursements-list-tab"]');

    // Test status filtering
    await page.selectOption('[data-testid="status-filter"]', 'paid');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Verify only paid reimbursements are shown
    const paidRows = page.locator('[data-testid="reimbursement-row"]');
    await expect(paidRows).toHaveCount(1); // From previous test
    
    await expect(paidRows.first().locator('[data-testid="reimbursement-status"]')).toContainText('Paid');

    // Clear filters
    await page.click('[data-testid="clear-filters-button"]');
    
    // Test user filtering
    await page.selectOption('[data-testid="user-filter"]', regularUser.id);
    await page.click('[data-testid="apply-filters-button"]');
    
    // Should show reimbursements for selected user
    const userRows = page.locator('[data-testid="reimbursement-row"]');
    await expect(userRows.count()).toBeGreaterThan(0);

    // Test date range filtering
    await page.fill('[data-testid="date-from-filter"]', '2024-03-01');
    await page.fill('[data-testid="date-to-filter"]', '2024-03-31');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Should show reimbursements in date range
    const dateFilteredRows = page.locator('[data-testid="reimbursement-row"]');
    await expect(dateFilteredRows.count()).toBeGreaterThan(0);

    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'business lunch');
    await page.click('[data-testid="search-button"]');
    
    // Should find reimbursements matching search term
    const searchResults = page.locator('[data-testid="reimbursement-row"]');
    await expect(searchResults.count()).toBeGreaterThan(0);
    await expect(searchResults.first().locator('[data-testid="reimbursement-description"]'))
      .toContainText('business lunch');
  });

  test('Mobile responsiveness of reimbursement interface', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login as admin
    await page.fill('[data-testid="email-input"]', 'e2e-admin@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="expenses-nav-mobile"]');

    // Verify mobile-optimized reimbursement interface
    await expect(page.locator('[data-testid="mobile-reimbursement-cards"]')).toBeVisible();
    
    // Test mobile reimbursement card interactions
    const mobileCard = page.locator('[data-testid="mobile-reimbursement-card"]').first();
    await expect(mobileCard).toBeVisible();
    
    // Tap to expand card details
    await mobileCard.click();
    await expect(page.locator('[data-testid="mobile-card-details"]')).toBeVisible();

    // Test mobile-optimized assignment modal
    await page.click('[data-testid="mobile-assign-button"]');
    await expect(page.locator('[data-testid="mobile-assignment-sheet"]')).toBeVisible();
    
    // Verify mobile form elements are properly sized
    const mobileSelect = page.locator('[data-testid="mobile-user-select"]');
    await expect(mobileSelect).toBeVisible();
    
    const selectBounds = await mobileSelect.boundingBox();
    expect(selectBounds.height).toBeGreaterThan(44); // Minimum touch target size
  });

  test('Performance: Large dataset handling', async ({ page, request }) => {
    // Create multiple test reimbursements for performance testing
    const reimbursements = [];
    
    for (let i = 0; i < 50; i++) {
      const response = await request.post('/api/expenses/test-reimbursement', {
        data: {
          amount: (i + 1) * 10,
          description: `Performance Test Reimbursement ${i}`,
          status: i % 3 === 0 ? 'pending' : i % 3 === 1 ? 'scheduled' : 'paid',
          userId: regularUser.id
        }
      });
      reimbursements.push(await response.json());
    }

    // Login as admin
    await page.fill('[data-testid="email-input"]', 'e2e-admin@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    // Navigate to reimbursements with performance monitoring
    const startTime = Date.now();
    
    await page.click('[data-testid="expenses-nav"]');
    await page.click('[data-testid="reimbursements-list-tab"]');
    
    // Wait for reimbursements to load
    await expect(page.locator('[data-testid="reimbursement-row"]').first()).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Performance assertion - should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Test scrolling performance with large dataset
    const scrollStartTime = Date.now();
    
    await page.evaluate(() => {
      document.querySelector('[data-testid="reimbursements-container"]').scrollTo(0, 1000);
    });
    
    await page.waitForTimeout(100); // Allow for scroll rendering
    
    const scrollTime = Date.now() - scrollStartTime;
    expect(scrollTime).toBeLessThan(500);

    // Test filtering performance
    const filterStartTime = Date.now();
    
    await page.selectOption('[data-testid="status-filter"]', 'paid');
    await page.click('[data-testid="apply-filters-button"]');
    
    await expect(page.locator('[data-testid="filter-results-count"]')).toContainText('17 results'); // Approximately 1/3 are paid
    
    const filterTime = Date.now() - filterStartTime;
    expect(filterTime).toBeLessThan(1000);

    // Clean up test data
    for (const reimbursement of reimbursements) {
      await request.delete(`/api/expenses/reimbursements/${reimbursement.id}`);
    }
  });

  test('Accessibility compliance', async ({ page }) => {
    // Login as admin
    await page.fill('[data-testid="email-input"]', 'e2e-admin@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');

    await page.click('[data-testid="expenses-nav"]');
    await page.click('[data-testid="reimbursements-tab"]');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Navigate through reimbursement interface using keyboard
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }

    // Test Enter key activation
    const firstReimbursement = page.locator('[data-testid="reimbursement-row"]').first();
    await firstReimbursement.focus();
    await page.keyboard.press('Enter');
    
    await expect(page.locator('[data-testid="reimbursement-details-modal"]')).toBeVisible();

    // Test Escape key to close modal
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="reimbursement-details-modal"]')).not.toBeVisible();

    // Verify ARIA labels and roles
    const assignButton = page.locator('[data-testid="assign-reimbursement-button"]');
    await expect(assignButton).toHaveAttribute('aria-label', 'Assign reimbursement to user');
    
    const statusSelect = page.locator('[data-testid="status-filter"]');
    await expect(statusSelect).toHaveAttribute('aria-label', 'Filter by reimbursement status');

    // Test screen reader announcements (would need axe-core or similar for full testing)
    const successMessage = page.locator('[data-testid="success-message"]');
    if (await successMessage.isVisible()) {
      await expect(successMessage).toHaveAttribute('role', 'alert');
      await expect(successMessage).toHaveAttribute('aria-live', 'polite');
    }
  });
});