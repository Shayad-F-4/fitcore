import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import { ENV } from '../src/config/env.js';

describe('FitCore API Suite', () => {
  let authToken = '';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGODB_URI);
    }
  });

  describe('1. Health and Connectivity', () => {
    it('should return 200 OK on /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('online');
      expect(res.body.system).toContain('FitCore');
    });
  });

  describe('2. Authentication and RBAC', () => {
    it('should reject login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@fitcore.com',
        password: 'incorrectPassword999',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should successfully log in as Super Admin and return JWT', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@fitcore.com',
        password: 'password123',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('SUPER_ADMIN');
      authToken = res.body.data.token;
    });

    it('should fetch authenticated user profile via /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('admin@fitcore.com');
    });

    it('should reject unauthenticated access to protected endpoints', async () => {
      const res = await request(app).get('/api/members');
      expect(res.status).toBe(401);
    });
  });

  describe('3. Plans and Branches', () => {
    it('should retrieve seeded membership plans', async () => {
      const res = await request(app)
        .get('/api/plans')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should retrieve gym branches', async () => {
      const res = await request(app)
        .get('/api/branches')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('4. Member Management', () => {
    it('should retrieve member statistics', async () => {
      const res = await request(app)
        .get('/api/members/stats')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBeGreaterThan(0);
      expect(res.body.data.active).toBeDefined();
    });

    it('should list paginated members', async () => {
      const res = await request(app)
        .get('/api/members?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination.total).toBeGreaterThan(0);
    });

    it('should find member by digital QR pass token', async () => {
      const res = await request(app)
        .get('/api/members/by-qr/FIT_QR_FC1001_DH89')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.member.fullName).toBe('David Hayes');
      expect(res.body.data.member.memberId).toBe('FC-1001');
    });
  });

  describe('5. Attendance and Occupancy', () => {
    it('should get current live occupancy', async () => {
      const res = await request(app)
        .get('/api/attendance/live')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.data.count).toBe('number');
      expect(Array.isArray(res.body.data.occupants)).toBe(true);
    });

    it('should get today attendance log', async () => {
      const res = await request(app)
        .get('/api/attendance/today')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('6. Payments & Finance', () => {
    it('should list payments with receipt details', async () => {
      const res = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].receiptNumber).toBeDefined();
    });
  });

  describe('7. Dashboard & Analytics', () => {
    it('should compute real KPI metrics from database records', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.metrics.totalMembers).toBeGreaterThan(0);
      expect(res.body.data.metrics.todayTotalCheckins).toBeDefined();
      expect(res.body.data.metrics.monthlyRevenue).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.monthlyRevenueData)).toBe(true);
      expect(Array.isArray(res.body.data.expiringMemberships)).toBe(true);
    });
  });
});
