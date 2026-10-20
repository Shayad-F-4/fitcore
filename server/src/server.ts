import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import { seedDatabase } from './scripts/seed.js';
import { ensureCoreUsers } from './scripts/ensureUsers.js';
import { migrateToSingleGym } from './scripts/migrateSingleGym.js';
import { runExpirationCheck } from './services/expirationService.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import branchRoutes from './routes/branch.routes.js';
import planRoutes from './routes/plan.routes.js';
import memberRoutes from './routes/member.routes.js';
import membershipRoutes from './routes/membership.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import auditRoutes from './routes/audit.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import followUpRoutes from './routes/followUp.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import expiryRoutes from './routes/expiry.routes.js';
import { runAutoExpiryReminders } from './services/whatsappService.js';

import rateLimit from 'express-rate-limit';

const app = express();

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  skip: () => ENV.NODE_ENV === 'test',
});

// Security and standard middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...configuredOrigins,
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'https://client-seven-zeta-72.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.pages.dev') ||
        origin.endsWith('.onrender.com')
      ) {
        callback(null, true);
      } else {
        // Allow origin in development/production if not explicitly blocked
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static file serving for uploads (member photographs)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health check endpoint (both /health and /api/health for Render/cloud load balancers)
app.get(['/health', '/api/health'], (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'online',
    system: 'FitCore — Sagar Fitness Gym API',
    facility: 'Sagar Fitness Gym, Pathardi, Maharashtra, India',
    database: dbStatus,
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/members/:memberId/follow-ups', followUpRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/expiry', expiryRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Server Exception]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Boot server & establish database connection
const startServer = async () => {
  try {
    await connectDB();
    // Ensure Sagar Fitness Gym admin and desk users are always available
    await ensureCoreUsers().catch((e) => console.error('[Auth Init Error]', e));
    // Ensure single Sagar Fitness Gym branch is established
    await migrateToSingleGym().catch((e) => console.error('[Single Gym Migration Error]', e));

    // Auto-seed if database is clean
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[FitCore] First-time setup detected. Seeding initial data...');
      await seedDatabase();
    } else {
      // Run expiration check to sync member statuses and notifications
      await runExpirationCheck();
      // Run automated 2-day expiry WhatsApp reminders (safely deduplicated)
      await runAutoExpiryReminders();
    }

    // Set periodic expiration & reminder monitor (every 30 mins)
    setInterval(async () => {
      try {
        await runExpirationCheck();
        await runAutoExpiryReminders();
      } catch (err) {
        console.error('[Background Expiration/Reminder Error]', err);
      }
    }, 30 * 60 * 1000);

    const serverInstance = app.listen(ENV.PORT, () => {
      console.log(`⚡ [Sagar Fitness Server] Running on http://localhost:${ENV.PORT}`);
      console.log(`🚀 [API Docs & Health] http://localhost:${ENV.PORT}/api/health`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
      serverInstance.close(async () => {
        console.log('[Server] HTTP server closed.');
        try {
          await mongoose.connection.close();
          console.log('[Database] MongoDB connection closed.');
          process.exit(0);
        } catch (err) {
          console.error('[Database] Error closing MongoDB connection:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start Sagar Fitness Gym Server:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  startServer();
}

export default app;
