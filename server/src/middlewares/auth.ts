import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

import { User } from '../models/User.js';

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authorization token required', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    // Verify that user exists in database and is active
    const activeUser = await User.findById(decoded.userId).select('status role');
    if (!activeUser) {
      sendError(res, 'Account no longer exists', 401);
      return;
    }
    if (activeUser.status !== 'ACTIVE') {
      sendError(res, 'Account has been deactivated. Please contact gym administrator.', 403);
      return;
    }
    req.user = decoded;
    req.user.role = activeUser.role;
    next();
  } catch (err) {
    sendError(res, 'Invalid or expired session token', 401);
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'Forbidden: Insufficient permissions for this resource', 403);
      return;
    }

    next();
  };
};

export const optionalAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = verifyToken(token);
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
};
