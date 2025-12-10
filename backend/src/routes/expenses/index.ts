/**
 * @fileoverview Expense Routes Barrel File
 * @description Central router for all expense-related endpoints.
 *
 * This file will be updated in Session 5 to mount all routes from parallel sessions.
 */

import { Router } from 'express';
import referenceRoutes from './expenses.reference.routes';
import approvalRoutes from './expenses.approval.routes';
import pendingRoutes from './expenses.pending.routes';

const router = Router();

// Session 2: Pending expenses route
router.use(pendingRoutes);

// Session 3: Approval routes (approve/reject endpoints)
router.use(approvalRoutes);

// Session 4: Reference data routes (categories, vendors)
router.use(referenceRoutes);

export default router;
