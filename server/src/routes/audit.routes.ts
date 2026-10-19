import { Router, Response } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.action && req.query.action !== 'ALL') {
      filter.action = req.query.action;
    }
    if (req.query.userRole && req.query.userRole !== 'ALL') {
      filter.userRole = req.query.userRole;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('user', 'fullName email avatarUrl role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    sendPaginated(res, logs, total, page, limit, 'Audit logs fetched');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch audit logs', 500);
  }
});

export default router;
