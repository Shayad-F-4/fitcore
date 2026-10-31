import { Router, Request, Response } from 'express';

const router = Router();

// Login page
router.get('/login', (_req: Request, res: Response) => {
  res.render('login');
});

// Dashboard
router.get('/', (_req: Request, res: Response) => {
  res.render('dashboard');
});

// Members
router.get('/members', (_req: Request, res: Response) => {
  res.render('members');
});

// Membership Plans
router.get('/plans', (_req: Request, res: Response) => {
  res.render('plans');
});

// Billing & Fees
router.get(['/billing', '/payments'], (_req: Request, res: Response) => {
  res.render('billing');
});

// Settings
router.get('/settings', (_req: Request, res: Response) => {
  res.render('settings');
});

// Redirect removed legacy routes cleanly to dashboard / members
router.get(['/attendance', '/reports', '/pos', '/inventory', '/ai-coach', '/diet'], (_req: Request, res: Response) => {
  res.redirect('/');
});

export default router;
