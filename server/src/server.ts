import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import { seedDatabase } from './scripts/seed.js';

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

const app = express();

// Security and standard middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    system: 'FitCore Gym Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditRoutes);

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

    // Auto-seed if database is clean
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[FitCore] First-time setup detected. Seeding initial data...');
      await seedDatabase();
    }

    app.listen(ENV.PORT, () => {
      console.log(`⚡ [FitCore Server] Running with high performance on http://localhost:${ENV.PORT}`);
      console.log(`🚀 [API Docs & Health] http://localhost:${ENV.PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start FitCore Server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
