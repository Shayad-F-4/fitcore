import { Router, Response } from 'express';
import { User, UserRole } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// Demo accounts dictionary for seamless one-click testing
const DEMO_ACCOUNTS: Record<string, { email: string; role: UserRole; name: string }> = {
  SUPER_ADMIN: {
    email: 'admin@fitcore.com',
    role: 'SUPER_ADMIN',
    name: 'Alex Vance (Super Admin)',
  },
  GYM_ADMIN: {
    email: 'manager@fitcore.com',
    role: 'GYM_ADMIN',
    name: 'Marcus Sterling (Gym Manager)',
  },
  RECEPTIONIST: {
    email: 'reception@fitcore.com',
    role: 'RECEPTIONIST',
    name: 'Sarah Jenkins (Front Desk)',
  },
  TRAINER: {
    email: 'trainer@fitcore.com',
    role: 'TRAINER',
    name: 'Elena Rostova (Head Coach)',
  },
  MEMBER: {
    email: 'member@fitcore.com',
    role: 'MEMBER',
    name: 'David Hayes (VIP Member)',
  },
};

// Register
router.post('/register', async (req, res: Response) => {
  try {
    const { email, password, fullName, phone, role, branchId } = req.body;

    if (!email || !password || !fullName) {
      sendError(res, 'Email, password and full name are required', 400);
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      sendError(res, 'An account with this email already exists', 409);
      return;
    }

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      fullName: fullName.trim(),
      phone: phone || '',
      role: role || 'MEMBER',
      branch: branchId || undefined,
      status: 'ACTIVE',
    });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      branchId: user.branch?.toString(),
    });

    await recordAuditLog({
      userId: user._id.toString(),
      userName: user.fullName,
      userRole: user.role,
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: user._id.toString(),
      details: { email: user.email, role: user.role },
      ip: req.ip,
    });

    sendSuccess(
      res,
      'Registration successful',
      {
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          branch: user.branch,
          avatarUrl: user.avatarUrl,
        },
      },
      201
    );
  } catch (error: any) {
    console.error('[Auth Error]', error);
    sendError(res, error.message || 'Registration failed', 500);
  }
});

// Login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, 'Email and password are required', 400);
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      sendError(res, 'Invalid email or password credentials', 401);
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, 'Invalid email or password credentials', 401);
      return;
    }

    if (user.status !== 'ACTIVE') {
      sendError(res, 'Account is inactive or suspended. Please contact gym administrator.', 403);
      return;
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      branchId: user.branch?.toString(),
    });

    await recordAuditLog({
      userId: user._id.toString(),
      userName: user.fullName,
      userRole: user.role,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user._id.toString(),
      ip: req.ip,
    });

    sendSuccess(res, 'Login successful', {
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        branch: user.branch,
        avatarUrl: user.avatarUrl,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error: any) {
    console.error('[Auth Login Error]', error);
    sendError(res, error.message || 'Login failed', 500);
  }
});

// Demo Login (One-click switch for evaluation)
router.post('/demo-login', async (req, res: Response) => {
  try {
    const roleKey = (req.body.role || 'SUPER_ADMIN').toUpperCase();
    const demoProfile = DEMO_ACCOUNTS[roleKey] || DEMO_ACCOUNTS.SUPER_ADMIN;

    let user = await User.findOne({ email: demoProfile.email });
    if (!user) {
      // Auto-create demo user if not seeded yet
      user = await User.create({
        email: demoProfile.email,
        password: 'password123',
        fullName: demoProfile.name,
        role: demoProfile.role,
        status: 'ACTIVE',
        avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      branchId: user.branch?.toString(),
    });

    sendSuccess(res, `Logged in as demo ${demoProfile.role}`, {
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        branch: user.branch,
        avatarUrl: user.avatarUrl,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error: any) {
    console.error('[Demo Login Error]', error);
    sendError(res, error.message || 'Demo login failed', 500);
  }
});

// Current User Profile
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId).populate('branch');
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, 'User profile fetched', {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        branch: user.branch,
        avatarUrl: user.avatarUrl,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch user', 500);
  }
});

export default router;
