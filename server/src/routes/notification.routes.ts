import { Router, Response } from 'express';
import { Notification } from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';
import { runExpirationCheck } from '../services/expirationService.js';

const router = Router();

// Get active notifications and unread badge count
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ dismissed: false })
        .populate('member', 'fullName memberId photoUrl')
        .populate('membership', 'status expiryDate')
        .sort({ createdAt: -1 })
        .limit(limit),
      Notification.countDocuments({ read: false, dismissed: false }),
    ]);

    sendSuccess(res, 'Notifications retrieved', {
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch notifications', 500);
  }
});

// Mark single notification as read
router.patch('/:id/read', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notif) {
      sendError(res, 'Notification not found', 404);
      return;
    }
    sendSuccess(res, 'Notification marked as read', notif);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update notification', 500);
  }
});

// Mark all as read
router.patch('/read-all', authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    sendSuccess(res, 'All notifications marked as read');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to mark notifications read', 500);
  }
});

// Dismiss notification
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { dismissed: true },
      { new: true }
    );
    if (!notif) {
      sendError(res, 'Notification not found', 404);
      return;
    }
    sendSuccess(res, 'Notification dismissed');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to dismiss notification', 500);
  }
});

// Sync / trigger expiration check on demand
router.post('/sync-expirations', authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const summary = await runExpirationCheck();
    sendSuccess(res, 'Expiration checks synced successfully', summary);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to sync expirations', 500);
  }
});

export default router;
