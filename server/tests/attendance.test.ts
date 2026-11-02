import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import { ENV } from '../src/config/env.js';
import { Member } from '../src/models/Member.js';
import { Attendance } from '../src/models/Attendance.js';
import { getTodayISTString } from '../src/routes/attendance.routes.js';

describe('Attendance Management Module Integration Suite', () => {
  let authToken = '';
  let testMemberId = '';
  let createdAttendanceId = '';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGODB_URI);
    }

    // Login Super Admin
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@fitcore.com',
      password: 'password123',
    });
    authToken = loginRes.body.data.token;

    // Find an active member for attendance testing
    let member = await Member.findOne({ status: 'ACTIVE' });
    if (!member) {
      member = await Member.create({
        memberId: 'FC-TEST-ATT',
        fullName: 'Test Athlete Attendance',
        phone: '9988776655',
        status: 'ACTIVE',
        gender: 'MALE',
      });
    }
    testMemberId = member._id.toString();

    // Clean up any test attendance on today's date for this member
    const today = getTodayISTString();
    await Attendance.deleteMany({ member: testMemberId, date: today });
  });

  it('1. GET /api/attendance/today - Retrieves today attendance and stats', async () => {
    const res = await request(app)
      .get('/api/attendance/today')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats).toBeDefined();
    expect(Array.isArray(res.body.data.records)).toBe(true);
    expect(Array.isArray(res.body.data.unmarkedMembers)).toBe(true);
  });

  it('2. POST /api/attendance - Marks a member as PRESENT', async () => {
    const today = getTodayISTString();
    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        memberId: testMemberId,
        date: today,
        status: 'PRESENT',
        notes: 'Morning cardio & weights',
        method: 'MANUAL',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PRESENT');
    expect(res.body.data.notes).toBe('Morning cardio & weights');
    expect(res.body.data.date).toBe(today);
    createdAttendanceId = res.body.data._id;
  });

  it('3. POST /api/attendance - Prevents duplicate attendance for same member on same date (Requirement 8)', async () => {
    const today = getTodayISTString();
    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        memberId: testMemberId,
        date: today,
        status: 'PRESENT',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already marked/i);
  });

  it('4. PUT /api/attendance/:id - Updates status to ABSENT and notes', async () => {
    const res = await request(app)
      .put(`/api/attendance/${createdAttendanceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'ABSENT',
        notes: 'Called in: Rest day',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ABSENT');
    expect(res.body.data.notes).toBe('Called in: Rest day');
  });

  it('5. GET /api/attendance - Retrieves historical records with status filter and pagination', async () => {
    const today = getTodayISTString();
    const res = await request(app)
      .get(`/api/attendance?date=${today}&status=ABSENT`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('6. GET /api/attendance/reports - Generates monthly summary and daily breakdown', async () => {
    const today = getTodayISTString();
    const month = today.slice(0, 7);
    const res = await request(app)
      .get(`/api/attendance/reports?month=${month}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dailySummary).toBeDefined();
    expect(Array.isArray(res.body.data.dailySummary)).toBe(true);
    expect(Array.isArray(res.body.data.memberSummaries)).toBe(true);
  });

  it('7. DELETE /api/attendance/:id - Removes the attendance record', async () => {
    const res = await request(app)
      .delete(`/api/attendance/${createdAttendanceId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await Attendance.findById(createdAttendanceId);
    expect(check).toBeNull();
  });
});

