import { Router, Response } from 'express';
import { MembershipPlan } from '../models/MembershipPlan.js';
import { Membership } from '../models/Membership.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middlewares/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// Get all membership plans
router.get('/', async (req, res: Response) => {
  try {
    const { activeOnly } = req.query;
    const filter = activeOnly === 'true' ? { active: true } : {};
    const plans = await MembershipPlan.find(filter).sort({ price: 1 });
    sendSuccess(res, 'Membership plans fetched successfully', plans);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch membership plans', 500);
  }
});

// Create new plan (Admin only)
router.post('/', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, type, durationDays, price, description, features, isPopular, badge } = req.body;

    if (!name || !durationDays || price === undefined) {
      sendError(res, 'Name, duration (days), and price are required', 400);
      return;
    }

    const plan = await MembershipPlan.create({
      name,
      type: type || 'MONTHLY',
      durationDays: Number(durationDays),
      price: Number(price),
      description: description || '',
      features: Array.isArray(features) ? features : [],
      isPopular: Boolean(isPopular),
      badge: badge || '',
      active: true,
    });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'PLAN_CREATED',
      entity: 'MembershipPlan',
      entityId: plan._id.toString(),
      details: { name: plan.name, price: plan.price },
    });

    sendSuccess(res, 'Plan created successfully', plan, 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create plan', 500);
  }
});

// Update plan
router.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await MembershipPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) {
      sendError(res, 'Plan not found', 404);
      return;
    }
    sendSuccess(res, 'Plan updated successfully', plan);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update plan', 500);
  }
});

// Toggle plan status
router.patch('/:id/toggle-status', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req, res: Response) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      sendError(res, 'Plan not found', 404);
      return;
    }
    plan.active = !plan.active;
    await plan.save();
    sendSuccess(res, `Plan ${plan.active ? 'activated' : 'deactivated'} successfully`, plan);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to toggle plan status', 500);
  }
});

// Delete plan (Admin only)
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      sendError(res, 'Plan not found', 404);
      return;
    }

    // Check if active or frozen memberships exist for this plan
    const activeSubscribersCount = await Membership.countDocuments({
      plan: plan._id,
      status: { $in: ['ACTIVE', 'FROZEN'] },
    });

    if (activeSubscribersCount > 0) {
      sendError(
        res,
        `Cannot delete "${plan.name}" because ${activeSubscribersCount} active member(s) are currently subscribed to it. You can deactivate it instead to stop new sign-ups.`,
        400
      );
      return;
    }

    await MembershipPlan.findByIdAndDelete(plan._id);

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'PLAN_DELETED',
      entity: 'MembershipPlan',
      entityId: plan._id.toString(),
      details: { name: plan.name, price: plan.price },
    });

    sendSuccess(res, `Plan "${plan.name}" deleted successfully`, { id: plan._id });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete plan', 500);
  }
});

export default router;
