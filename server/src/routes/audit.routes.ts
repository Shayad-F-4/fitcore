import { Router, Response } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(),
    ]);

    sendPaginated(res, logs, total, page, limit, 'Audit logs fetched');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch audit logs', 500);
  }
});

export default router;
