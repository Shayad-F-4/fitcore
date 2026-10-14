import { AuditLog } from '../models/AuditLog.js';

export const recordAuditLog = async (params: {
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ip?: string;
}) => {
  try {
    await AuditLog.create({
      user: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details,
      ip: params.ip,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err);
  }
};
