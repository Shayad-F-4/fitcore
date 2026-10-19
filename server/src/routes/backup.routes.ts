import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { User } from '../models/User.js';
import { Member } from '../models/Member.js';
import { Membership } from '../models/Membership.js';
import { MembershipPlan } from '../models/MembershipPlan.js';
import { Payment } from '../models/Payment.js';
import { Attendance } from '../models/Attendance.js';
import { Branch } from '../models/Branch.js';
import { GymSettings } from '../models/GymSettings.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { AuditLog } from '../models/AuditLog.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middlewares/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// Ensure backups directory exists
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export interface BackupMetadata {
  version: string;
  filename: string;
  createdAt: string;
  createdBy: string;
  totalRecords: number;
  collectionCounts: Record<string, number>;
  fileSizeBytes: number;
}

/**
 * Helper to generate a full database JSON snapshot
 */
export async function createDatabaseSnapshot(createdByEmail = 'system'): Promise<{
  filename: string;
  metadata: BackupMetadata;
  filePath: string;
}> {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `fitcore_backup_${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  const [
    users,
    members,
    memberships,
    plans,
    payments,
    attendance,
    branches,
    gymSettings,
    notificationLogs,
    auditLogs,
  ] = await Promise.all([
    User.find().lean(),
    Member.find().lean(),
    Membership.find().lean(),
    MembershipPlan.find().lean(),
    Payment.find().lean(),
    Attendance.find().lean(),
    Branch.find().lean(),
    GymSettings.find().lean(),
    NotificationLog.find().lean(),
    AuditLog.find().lean(),
  ]);

  const collectionCounts = {
    users: users.length,
    members: members.length,
    memberships: memberships.length,
    plans: plans.length,
    payments: payments.length,
    attendance: attendance.length,
    branches: branches.length,
    gymSettings: gymSettings.length,
    notificationLogs: notificationLogs.length,
    auditLogs: auditLogs.length,
  };

  const totalRecords = Object.values(collectionCounts).reduce((a, b) => a + b, 0);

  const backupPayload = {
    metadata: {
      version: '1.0',
      system: 'FitCore Gym Management System',
      createdAt: now.toISOString(),
      createdBy: createdByEmail,
      totalRecords,
      collectionCounts,
    },
    data: {
      users,
      members,
      memberships,
      plans,
      payments,
      attendance,
      branches,
      gymSettings,
      notificationLogs,
      auditLogs,
    },
  };

  const content = JSON.stringify(backupPayload, null, 2);
  fs.writeFileSync(filePath, content, 'utf-8');

  const stats = fs.statSync(filePath);
  const metadata: BackupMetadata = {
    version: '1.0',
    filename,
    createdAt: now.toISOString(),
    createdBy: createdByEmail,
    totalRecords,
    collectionCounts,
    fileSizeBytes: stats.size,
  };

  return { filename, metadata, filePath };
}

// 1. List all available backups
router.get('/', authenticate, requireRole('SUPER_ADMIN'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      sendSuccess(res, 'Backups list', []);
      return;
    }

    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));
    const backups: BackupMetadata[] = [];

    for (const f of files) {
      try {
        const fullPath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(fullPath);
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(raw);
        backups.push({
          version: parsed.metadata?.version || '1.0',
          filename: f,
          createdAt: parsed.metadata?.createdAt || stats.mtime.toISOString(),
          createdBy: parsed.metadata?.createdBy || 'system',
          totalRecords: parsed.metadata?.totalRecords || 0,
          collectionCounts: parsed.metadata?.collectionCounts || {},
          fileSizeBytes: stats.size,
        });
      } catch (err) {
        console.warn(`[Backup List] Failed to read ${f}:`, err);
      }
    }

    // Sort newest first
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    sendSuccess(res, 'Database backups retrieved', backups);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to list backups', 500);
  }
});

// 2. Create a manual backup
router.post('/create', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const createdBy = req.user?.email || 'admin@fitcore.com';
    const result = await createDatabaseSnapshot(createdBy);

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'SYSTEM_SETTINGS_UPDATED',
      entity: 'DatabaseBackup',
      details: {
        action: 'BACKUP_CREATED',
        filename: result.filename,
        totalRecords: result.metadata.totalRecords,
        fileSizeBytes: result.metadata.fileSizeBytes,
      },
    });

    sendSuccess(res, `Backup "${result.filename}" successfully created (${result.metadata.totalRecords} records preserved)`, result.metadata, 201);
  } catch (error: any) {
    console.error('[Backup Create Error]', error);
    sendError(res, error.message || 'Failed to create database backup', 500);
  }
});

// 3. Download a backup file
router.get('/download/:filename', authenticate, requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const filename = String(req.params.filename);
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      sendError(res, 'Backup file not found', 404);
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    res.setHeader('Content-Type', 'application/json');
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to download backup', 500);
  }
});

// 4. Restore database from an existing backup file
router.post('/restore/:filename', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filename = String(req.params.filename);
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      sendError(res, 'Backup file not found', 404);
      return;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const backup = JSON.parse(raw);

    if (!backup.data) {
      sendError(res, 'Invalid backup format: data payload missing', 400);
      return;
    }

    const {
      users = [],
      members = [],
      memberships = [],
      plans = [],
      payments = [],
      attendance = [],
      branches = [],
      gymSettings = [],
    } = backup.data;

    // Safety: upsert records to restore data without creating duplicates
    if (branches.length > 0) {
      for (const b of branches) {
        await Branch.findByIdAndUpdate(b._id, b, { upsert: true });
      }
    }
    if (plans.length > 0) {
      for (const p of plans) {
        await MembershipPlan.findByIdAndUpdate(p._id, p, { upsert: true });
      }
    }
    if (users.length > 0) {
      for (const u of users) {
        await User.findByIdAndUpdate(u._id, u, { upsert: true });
      }
    }
    if (members.length > 0) {
      for (const m of members) {
        await Member.findByIdAndUpdate(m._id, m, { upsert: true });
      }
    }
    if (memberships.length > 0) {
      for (const sub of memberships) {
        await Membership.findByIdAndUpdate(sub._id, sub, { upsert: true });
      }
    }
    if (payments.length > 0) {
      for (const pay of payments) {
        await Payment.findByIdAndUpdate(pay._id, pay, { upsert: true });
      }
    }
    if (attendance.length > 0) {
      for (const att of attendance) {
        await Attendance.findByIdAndUpdate(att._id, att, { upsert: true });
      }
    }
    if (gymSettings.length > 0) {
      for (const gs of gymSettings) {
        await GymSettings.findByIdAndUpdate(gs._id, gs, { upsert: true });
      }
    }

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'SYSTEM_SETTINGS_UPDATED',
      entity: 'DatabaseBackup',
      details: {
        action: 'BACKUP_RESTORED',
        filename: sanitizedFilename,
        restoredRecords: (backup.metadata?.totalRecords || 0),
      },
    });

    sendSuccess(res, `Database successfully restored from "${sanitizedFilename}". All records updated.`, {
      filename: sanitizedFilename,
      restoredRecords: backup.metadata?.totalRecords || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Backup Restore Error]', error);
    sendError(res, error.message || 'Failed to restore database from backup', 500);
  }
});

// 5. Delete an old backup file
router.delete('/:filename', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filename = String(req.params.filename);
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      sendError(res, 'Backup file not found', 404);
      return;
    }

    fs.unlinkSync(filePath);

    await recordAuditLog({
      userId: req.user?.userId,
      userName: req.user?.email,
      userRole: req.user?.role,
      action: 'SYSTEM_SETTINGS_UPDATED',
      entity: 'DatabaseBackup',
      details: {
        action: 'BACKUP_DELETED',
        filename: sanitizedFilename,
      },
    });

    sendSuccess(res, `Backup "${sanitizedFilename}" successfully deleted.`);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete backup', 500);
  }
});

/**
 * Daily Automated Backup Routine
 * Ensures that at least one backup snapshot exists for today.
 */
export async function runAutomatedDailyBackup() {
  try {
    const todayPrefix = `fitcore_backup_${new Date().toISOString().slice(0, 10)}`;
    if (fs.existsSync(BACKUP_DIR)) {
      const existing = fs.readdirSync(BACKUP_DIR).find((f) => f.startsWith(todayPrefix));
      if (existing) {
        console.log(`[Auto Backup] Today's snapshot already exists: ${existing}`);
        return;
      }
    }

    console.log('[Auto Backup] Generating automated daily database snapshot...');
    const result = await createDatabaseSnapshot('automated-scheduler');
    console.log(`[Auto Backup] Snapshot created successfully: ${result.filename} (${result.metadata.totalRecords} records)`);
  } catch (err) {
    console.error('[Auto Backup Error]', err);
  }
}

export default router;
