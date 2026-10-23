import { Router, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { User, UserRole } from '../models/User.js';
import { Member } from '../models/Member.js';
import { signToken } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middlewares/auth.js';
import { recordAuditLog } from '../utils/audit.js';
import {
  sendPasswordResetEmail,
  sendStaffWelcomeEmail,
  sendPasswordChangedConfirmation,
} from '../services/emailService.js';

const router = Router();

// Staff Provisioning & Registration (Gym Admin only - Public visitor registration prohibited)
router.post('/register', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, fullName, phone, role, branchId, avatarUrl } = req.body;

    if (!email || !password || !fullName) {
      sendError(res, 'Email, password and full name are required', 400);
      return;
    }

    if (password.length < 6) {
      sendError(res, 'Password must be at least 6 characters long', 400);
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      sendError(res, 'An account with this email already exists', 409);
      return;
    }

    const assignedRole = role === 'GYM_ADMIN' || role === 'RECEPTIONIST' ? role : 'RECEPTIONIST';

    const user = await User.create({
      email: cleanEmail,
      password,
      fullName: fullName.trim(),
      phone: phone || '',
      role: assignedRole,
      branch: branchId || undefined,
      avatarUrl: avatarUrl || '',
      status: 'ACTIVE',
    });

    // Dispatch welcome email to the newly provisioned staff member
    await sendStaffWelcomeEmail(user.email, user.fullName, user.role, password).catch((err) =>
      console.warn('[Staff Welcome Email Failed]', err)
    );

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

// Login (Supports ID / Username or Email + Password)
router.post('/login', async (req, res: Response) => {
  try {
    const { email, identifier, username, password } = req.body;
    const inputId = (email || identifier || username || '').toLowerCase().trim();

    if (!inputId || !password) {
      sendError(res, 'Email/ID and password are required', 400);
      return;
    }

    let user: any = await User.findOne({
      $or: [{ email: inputId }, { username: inputId }]
    }).select('+password');

    // Smart alias resolution if exact identifier not found
    if (!user) {
      const aliasMap: Record<string, string[]> = {
        'admin': ['shayadfakir2006@gmail.com', 'admin@sagarfitness.com', 'admin@fitcore.com'],
        'desk': ['desk@sagarfitness.com', 'reception@sagarfitness.com', 'reception@fitcore.com'],
        'reception': ['desk@sagarfitness.com', 'reception@sagarfitness.com', 'reception@fitcore.com'],
        'frontdesk': ['desk@sagarfitness.com', 'reception@sagarfitness.com', 'reception@fitcore.com'],
        'manager': ['manager@sagarfitness.com', 'manager@fitcore.com'],
        'admin@sagarfitness.com': ['shayadfakir2006@gmail.com', 'admin@fitcore.com'],
        'admin@fitcore.com': ['shayadfakir2006@gmail.com', 'admin@sagarfitness.com'],
        'shayadfakir2006@gmail.com': ['admin', 'admin@sagarfitness.com', 'admin@fitcore.com'],
        'desk@sagarfitness.com': ['reception@sagarfitness.com', 'reception@fitcore.com'],
        'reception@sagarfitness.com': ['desk@sagarfitness.com', 'reception@fitcore.com'],
        'reception@fitcore.com': ['desk@sagarfitness.com', 'reception@sagarfitness.com'],
        'manager@sagarfitness.com': ['manager@fitcore.com'],
        'manager@fitcore.com': ['manager@sagarfitness.com'],
      };
      const aliases = aliasMap[inputId] || [];
      for (const alt of aliases) {
        user = await User.findOne({
          $or: [{ email: alt }, { username: alt }]
        }).select('+password');
        if (user) break;
      }
    }

    if (!user) {
      sendError(res, 'Invalid ID/email or password credentials', 401);
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, 'Invalid ID/email or password credentials', 401);
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

    if (user.avatarUrl && user.avatarUrl.includes('unsplash.com')) {
      user.avatarUrl = '';
      await user.save().catch(() => {});
    }

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

// Current User Profile
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId).populate('branch');
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (user.avatarUrl && user.avatarUrl.includes('unsplash.com')) {
      user.avatarUrl = '';
      await user.save().catch(() => {});
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

// List all staff accounts for settings
router.get('/staff', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const staff = await User.find({}).populate('branch', 'name code').select('-password').sort({ createdAt: -1 });
    const sanitizedStaff = staff.map((s) => {
      const obj = s.toObject();
      if (obj.avatarUrl && obj.avatarUrl.includes('unsplash.com')) {
        obj.avatarUrl = '';
      }
      return obj;
    });
    sendSuccess(res, 'Staff list fetched', sanitizedStaff);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch staff', 500);
  }
});

// Update Profile (Full Name, Phone, and Avatar URL)
router.put('/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, phone, avatarUrl } = req.body;
    const user = await User.findById(req.user?.userId);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }
    if (fullName) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl.trim();
    await user.save();

    await recordAuditLog({
      userId: user._id.toString(),
      userName: user.fullName,
      userRole: user.role,
      action: 'PROFILE_UPDATED',
      entity: 'User',
      entityId: user._id.toString(),
      details: { fullName: user.fullName, phone: user.phone, avatarUpdated: Boolean(avatarUrl) },
      ip: req.ip,
    });

    sendSuccess(res, 'Profile updated successfully', {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        branch: user.branch,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update profile', 500);
  }
});

// Update Staff Member (Admin only: update name, role, phone, avatarUrl, status)
router.put('/staff/:id', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, phone, role, status, avatarUrl, branch } = req.body;
    const staff = await User.findById(req.params.id);
    if (!staff) {
      sendError(res, 'Staff member not found', 404);
      return;
    }

    // Safety Safeguard: Prevent deactivating or demoting the last remaining active administrator
    if (status === 'INACTIVE' || (role && role !== 'SUPER_ADMIN' && role !== 'GYM_ADMIN')) {
      if (staff.role === 'SUPER_ADMIN' || staff.role === 'GYM_ADMIN') {
        const activeAdminsCount = await User.countDocuments({
          role: { $in: ['SUPER_ADMIN', 'GYM_ADMIN'] },
          status: 'ACTIVE',
          _id: { $ne: staff._id },
        });
        if (activeAdminsCount === 0) {
          sendError(res, 'Action rejected: Cannot deactivate or demote the last remaining active gym administrator.', 400);
          return;
        }
      }
    }

    if (fullName) staff.fullName = fullName.trim();
    if (phone !== undefined) staff.phone = phone.trim();
    if (role) staff.role = role;
    if (status) staff.status = status;
    if (avatarUrl !== undefined) staff.avatarUrl = avatarUrl.trim();
    if (branch !== undefined) staff.branch = branch || undefined;
    await staff.save();

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'STAFF_UPDATED',
      entity: 'User',
      entityId: staff._id.toString(),
      details: { staffName: staff.fullName, staffRole: staff.role, status: staff.status },
      ip: req.ip,
    });

    sendSuccess(res, 'Staff member updated successfully', staff);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update staff member', 500);
  }
});

// Delete Staff Member (Admin only: SUPER_ADMIN and GYM_ADMIN)
router.delete('/staff/:id', authenticate, requireRole('SUPER_ADMIN', 'GYM_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawParam = req.params.id;
    const targetParam = (typeof rawParam === 'string' ? rawParam : String(rawParam || '')).trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(targetParam);

    const staff = isObjectId
      ? await User.findById(targetParam)
      : await User.findOne({ email: targetParam.toLowerCase() });

    if (!staff) {
      sendError(res, 'Staff member not found in database', 404);
      return;
    }

    // Safety Safeguard 1: Prevent an admin from deleting their own logged-in account
    if (req.user?.userId === staff._id.toString()) {
      sendError(res, 'Action rejected: You cannot delete your own active administrator account.', 400);
      return;
    }

    // Safety Safeguard 2: Prevent GYM_ADMIN from deleting SUPER_ADMIN (Owner)
    if (staff.role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      sendError(res, 'Permission denied: Only the Gym Owner (Super Admin) can delete another Super Admin account.', 403);
      return;
    }

    // Safety Safeguard 3: Prevent deleting the last remaining active administrator
    if (staff.role === 'SUPER_ADMIN' || staff.role === 'GYM_ADMIN') {
      const activeAdminsCount = await User.countDocuments({
        role: { $in: ['SUPER_ADMIN', 'GYM_ADMIN'] },
        status: 'ACTIVE',
        _id: { $ne: staff._id },
      });
      if (activeAdminsCount === 0) {
        sendError(res, 'Action rejected: Cannot delete the last remaining active gym administrator.', 400);
        return;
      }
    }

    // Unlink any member profile attached to this user account
    await Member.updateMany({ user: staff._id }, { $unset: { user: 1 } });

    // Permanently remove user document from database
    await User.findByIdAndDelete(staff._id);
    await User.deleteOne({ _id: staff._id });

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'STAFF_DELETED',
      entity: 'User',
      entityId: staff._id.toString(),
      details: {
        staffName: staff.fullName,
        staffEmail: staff.email,
        staffRole: staff.role,
        deletedBy: req.user?.email,
      },
      ip: req.ip,
    });

    sendSuccess(res, `Staff member "${staff.fullName}" (${staff.email}) was permanently deleted from the database.`);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete staff member from database', 500);
  }
});

// Change Password
router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      sendError(res, 'Current password and new password are required', 400);
      return;
    }

    if (newPassword.length < 6) {
      sendError(res, 'New password must be at least 6 characters long', 400);
      return;
    }

    const user = await User.findById(req.user?.userId).select('+password');
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      sendError(res, 'Current password is incorrect', 400);
      return;
    }

    user.password = newPassword;
    await user.save();

    await recordAuditLog({
      userId: user._id.toString(),
      userName: user.fullName,
      userRole: user.role,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: user._id.toString(),
      ip: req.ip,
    });

    // Dispatch security confirmation email
    await sendPasswordChangedConfirmation(user.email, user.fullName).catch((err) =>
      console.warn('[Password Changed Email Failed]', err)
    );

    sendSuccess(res, 'Password changed successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to change password', 500);
  }
});

// Forgot Password: generates secure token, stores SHA-256 hash with 15m expiry, dispatches real email
router.post('/forgot-password', async (req, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      sendError(res, 'Email address or User ID is required', 400);
      return;
    }

    const cleanInput = email.toLowerCase().trim();
    const adminSmtpEmail = (process.env.SMTP_USER || '').toLowerCase().trim();

    // 1. Direct search by email or username
    let user = await User.findOne({
      $or: [{ email: cleanInput }, { username: cleanInput }]
    });

    // 2. Alias resolution for admin, receptionist, manager
    if (!user) {
      const adminAliases = [
        'admin',
        'admin@sagarfitness.com',
        'admin@fitcore.com',
        'shayadfakir2006@gmail.com',
        adminSmtpEmail,
      ].filter(Boolean);

      const managerAliases = ['manager', 'manager@sagarfitness.com', 'manager@fitcore.com'];
      const deskAliases = [
        'desk',
        'reception',
        'receptionist',
        'frontdesk',
        'desk@sagarfitness.com',
        'reception@sagarfitness.com',
        'reception@fitcore.com',
      ];

      if (adminAliases.includes(cleanInput)) {
        user = await User.findOne({
          $or: [
            { email: { $in: adminAliases } },
            { username: 'admin' },
            { role: 'SUPER_ADMIN' },
          ],
        });
      } else if (managerAliases.includes(cleanInput)) {
        user = await User.findOne({
          $or: [
            { email: { $in: managerAliases } },
            { role: 'GYM_ADMIN' },
          ],
        });
      } else if (deskAliases.includes(cleanInput)) {
        user = await User.findOne({
          $or: [
            { email: { $in: deskAliases } },
            { role: 'RECEPTIONIST' },
          ],
        });
      }
    }

    if (user && user.status === 'ACTIVE') {
      // 15-second resend cooldown check per user account (bypassed in test environment)
      if (user.passwordResetExpires && process.env.NODE_ENV !== 'test') {
        const timeSinceCreation = 15 * 60 * 1000 - (user.passwordResetExpires.getTime() - Date.now());
        if (timeSinceCreation >= 0 && timeSinceCreation < 15 * 1000) {
          const waitSeconds = Math.max(1, Math.ceil((15 * 1000 - timeSinceCreation) / 1000));
          sendError(
            res,
            `Please wait ${waitSeconds} seconds before requesting another OTP.`,
            429
          );
          return;
        }
      }

      // Determine destination email:
      // If user typed a real external email address, send there;
      // otherwise, deliver to user's registered email or verified admin SMTP email
      const isPlaceholder = (addr: string) =>
        !addr.includes('@') || addr.endsWith('@fitcore.com') || addr.endsWith('@sagarfitness.com') || addr.endsWith('@example.com');

      let targetEmail = user.email;
      if (cleanInput.includes('@') && !isPlaceholder(cleanInput)) {
        targetEmail = cleanInput;
      } else if (isPlaceholder(targetEmail) && adminSmtpEmail) {
        targetEmail = adminSmtpEmail;
      }

      // Generate a user-friendly, cryptographically secure 6-digit numeric OTP
      const otp = Math.floor(100000 + crypto.randomInt(900000)).toString();
      const hashedToken = crypto.createHash('sha256').update(otp).digest('hex');
      const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = resetExpiry;
      await user.save();

      // If user is a super admin, sync the OTP across all super admin aliases
      // so resetting with OTP works whether user entered 'admin', 'shayad', or their email
      if (user.role === 'SUPER_ADMIN') {
        await User.updateMany(
          { role: 'SUPER_ADMIN', status: 'ACTIVE' },
          { $set: { passwordResetToken: hashedToken, passwordResetExpires: resetExpiry } }
        );
      }

      await recordAuditLog({
        userId: user._id.toString(),
        userName: user.fullName,
        userRole: user.role,
        action: 'PASSWORD_RESET_REQUESTED',
        entity: 'User',
        entityId: user._id.toString(),
        ip: req.ip,
      });

      // Dispatch real transactional email via Nodemailer
      const emailResult = await sendPasswordResetEmail(targetEmail, otp, user.fullName);

      if (!emailResult.success && !emailResult.isDevFallback) {
        console.error('[Password Reset Delivery Failed]', emailResult.error);
        sendError(
          res,
          `Failed to dispatch OTP email to ${targetEmail}. Please check SMTP configuration.`,
          500
        );
        return;
      }

      const isTest = process.env.NODE_ENV === 'test';
      sendSuccess(
        res,
        `Password reset OTP has been sent to ${targetEmail}. Please check your Gmail inbox or spam folder.`,
        isTest ? { resetToken: otp } : undefined
      );
      return;
    }

    sendError(res, `No active account found for "${cleanInput}". Please verify your email or username.`, 404);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to process password reset request', 500);
  }
});

// Reset Password with valid OTP code or token
router.post('/reset-password', async (req, res: Response) => {
  try {
    const { token, otp, newPassword } = req.body;
    const code = (token || otp || '').toString().trim();
    if (!code || !newPassword) {
      sendError(res, 'Verification OTP and new password are required', 400);
      return;
    }

    if (newPassword.length < 6) {
      sendError(res, 'Password must be at least 6 characters long', 400);
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(code).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      sendError(res, 'Password reset OTP code is invalid or has expired', 400);
      return;
    }

    // Sync new password to all SUPER_ADMIN accounts so login works with any admin username/alias
    if (user.role === 'SUPER_ADMIN') {
      const allAdmins = await User.find({ role: 'SUPER_ADMIN', status: 'ACTIVE' });
      for (const adm of allAdmins) {
        adm.password = newPassword;
        adm.passwordResetToken = undefined;
        adm.passwordResetExpires = undefined;
        await adm.save();
      }
    } else {
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
    }

    await recordAuditLog({
      userId: user._id.toString(),
      userName: user.fullName,
      userRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'User',
      entityId: user._id.toString(),
      ip: req.ip,
    });

    // Dispatch security confirmation email only to real verified addresses
    const isPlaceholder = (addr: string) =>
      !addr || !addr.includes('@') || addr.endsWith('@fitcore.com') || addr.endsWith('@sagarfitness.com') || addr.endsWith('@example.com');
    const adminSmtpEmail = (process.env.SMTP_USER || '').toLowerCase().trim();
    let confirmationTarget = user.email;
    if (isPlaceholder(confirmationTarget) && adminSmtpEmail) {
      confirmationTarget = adminSmtpEmail;
    }

    if (!isPlaceholder(confirmationTarget)) {
      await sendPasswordChangedConfirmation(confirmationTarget, user.fullName).catch((err) =>
        console.warn('[Password Changed Confirmation Email Failed]', err)
      );
    }

    sendSuccess(res, 'Password reset successfully. You can now log in with your new password.');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to reset password', 500);
  }
});

export default router;
