import { Router, Response } from 'express';
import { Branch } from '../models/Branch.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middlewares/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// Get all branches (public or auth)
router.get('/', async (_req, res: Response) => {
  try {
    const branches = await Branch.find().sort({ name: 1 });
    sendSuccess(res, 'Branches fetched successfully', branches);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch branches', 500);
  }
});

// Create branch (Admin only)
router.post('/', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, address, city, phone, email, openingHours, capacity } = req.body;

    const existing = await Branch.findOne({ code: code?.toUpperCase() });
    if (existing) {
      sendError(res, 'Branch code already in use', 400);
      return;
    }

    const branch = await Branch.create({
      name,
      code: code?.toUpperCase(),
      address,
      city,
      phone,
      email,
      openingHours,
      capacity: Number(capacity) || 200,
    });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'BRANCH_CREATED',
      entity: 'Branch',
      entityId: branch._id.toString(),
      details: { name: branch.name, code: branch.code },
    });

    sendSuccess(res, 'Branch created successfully', branch, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create branch', 500);
  }
});

// Update branch
router.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!branch) {
      sendError(res, 'Branch not found', 404);
      return;
    }
    sendSuccess(res, 'Branch updated successfully', branch);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update branch', 500);
  }
});

export default router;
