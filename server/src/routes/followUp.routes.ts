import { Router, Response } from 'express';
import { FollowUp } from '../models/FollowUp.js';
import { Member } from '../models/Member.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router({ mergeParams: true });

// Get follow-up records for a member
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const followUps = await FollowUp.find({ member: memberId })
      .populate('recordedBy', 'fullName role email')
      .sort({ createdAt: -1 });

    sendSuccess(res, 'Member follow-up history', followUps);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch follow-ups', 500);
  }
});

// Record new follow-up
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const { type, notes, followUpDate, contactOutcome, status } = req.body;

    if (!notes || notes.trim() === '') {
      sendError(res, 'Follow-up notes are required', 400);
      return;
    }

    const member = await Member.findById(memberId);
    if (!member) {
      sendError(res, 'Member not found', 404);
      return;
    }

    const followUp = await FollowUp.create({
      member: member._id,
      type: type || 'CALL',
      status: status || 'CONTACTED',
      notes: notes.trim(),
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      contactOutcome: contactOutcome || '',
      recordedBy: req.user?.userId,
    });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'FOLLOW_UP_RECORDED',
      entity: 'FollowUp',
      entityId: followUp._id.toString(),
      details: { member: member.fullName, type: followUp.type, status: followUp.status },
    });

    sendSuccess(res, 'Follow-up recorded successfully', followUp, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to record follow-up', 500);
  }
});

export default router;
