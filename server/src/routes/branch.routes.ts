import { Router, Response } from 'express';
import { Branch } from '../models/Branch.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middlewares/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// Get single gym location configuration
router.get('/', async (_req, res: Response) => {
  try {
    const branches = await Branch.find().sort({ createdAt: 1 }).limit(1);
    sendSuccess(res, 'Sagar Fitness Gym location fetched', branches);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch gym location', 500);
  }
});

// Single-gym policy: Branch creation is disabled
router.post('/', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (_req: AuthenticatedRequest, res: Response) => {
  sendError(res, 'Sagar Fitness Gym operates as a single-location facility. Multi-branch creation is disabled.', 400);
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
