/**
 * @fileoverview Expense Services Barrel File
 * @description Central export point for all expense-related services.
 *
 * Combines all modular expense services from parallel sessions.
 */

// Base class
export { ExpenseServiceBase, NotificationPayload } from './ExpenseServiceBase';

// Session 2: Pending expenses service
export {
  ExpensePendingService,
  expensePendingService,
  PaginatedResult,
  PendingExpense,
  ApprovalHistoryEntry
} from './ExpensePendingService';

// Session 3: Approval service
export {
  ExpenseApprovalService,
  expenseApprovalService,
  ApprovalData,
  RejectionData,
  ApprovalResult,
  RejectionResult
} from './ExpenseApprovalService';

// Session 4: Reference data service
export {
  ExpenseReferenceService,
  expenseReferenceService
} from './ExpenseReferenceService';

// Unified service object combining all functionality
import { expensePendingService } from './ExpensePendingService';
import { expenseApprovalService } from './ExpenseApprovalService';
import { expenseReferenceService } from './ExpenseReferenceService';

export const expenseServices = {
  pending: expensePendingService,
  approval: expenseApprovalService,
  reference: expenseReferenceService
};
