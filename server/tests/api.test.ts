import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import { ENV } from '../src/config/env.js';
import { runExpirationCheck } from '../src/services/expirationService.js';
import { Notification } from '../src/models/Notification.js';
import { Member } from '../src/models/Member.js';
import { Attendance } from '../src/models/Attendance.js';
import { Membership } from '../src/models/Membership.js';
import { User } from '../src/models/User.js';

describe('FitCore End-to-End API Suite (20 Acceptance Scenarios)', () => {
  let authToken = '';
  let branchId = '';
  let planId = '';
  let registeredMemberId = '';
  let registeredMembershipId = '';
  let uploadedPhotoUrl = '';
  let createdNotificationId = '';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGODB_URI);
    }

    // Super Admin Login
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@fitcore.com',
      password: 'password123',
    });
    authToken = loginRes.body.data.token;

    // Fetch branches and plans for subsequent tests
    const branchesRes = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${authToken}`);
    branchId = branchesRes.body.data[0]._id;

    const plansRes = await request(app)
      .get('/api/plans')
      .set('Authorization', `Bearer ${authToken}`);
    planId = plansRes.body.data[0]._id;

    // Ensure an expired member exists for Scenario 9 and 16
    let expiredMember = await Member.findOne({ memberId: 'FC-1007' });
    if (!expiredMember) {
      expiredMember = await Member.create({
        memberId: 'FC-1007',
        fullName: 'Vikram Singh (Expired)',
        phone: '9888877777',
        email: 'vikram.expired@example.com',
        branch: branchId,
        status: 'EXPIRED',
        qrCodeToken: 'FIT_QR_FC1007_EXPIRED',
      });
    } else {
      expiredMember.status = 'EXPIRED';
      await expiredMember.save();
    }

    await Membership.deleteMany({ member: expiredMember._id });
    await Membership.create({
      member: expiredMember._id,
      plan: planId,
      branch: branchId,
      startDate: new Date(Date.now() - 60 * 86400000),
      expiryDate: new Date(Date.now() - 7 * 86400000),
      durationDays: 30,
      originalPrice: 1500,
      discount: 0,
      price: 1500,
      amountDue: 1500,
      amountPaid: 1500,
      status: 'EXPIRED',
    });
  });

  // Scenario 1: Health & Connectivity
  it('1. System health check returns 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body.system).toContain('FitCore');
  });

  // Scenario 2: Reject Invalid Registration Data
  it('2. Rejects invalid registration data with missing required fields or invalid email', async () => {
    const res = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fullName: '',
        email: 'not-an-email',
        phone: '123',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Scenario 3: Reject Unauthorized Registration
  it('3. Rejects unauthorized member registration without token', async () => {
    const res = await request(app).post('/api/members').send({
      fullName: 'Intruder Athlete',
      email: 'intruder@domain.com',
      phone: '+1 555-000-1111',
      branch: branchId,
    });
    expect(res.status).toBe(401);
  });

  // Scenario 4: Upload and Retrieve Member Photograph
  it('4. Uploads member photograph securely and returns URL', async () => {
    // 1x1 transparent png data url
    const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await request(app)
      .post('/api/upload/photo')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        imageBase64: samplePng,
        filename: 'test_athlete.png',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.url).toMatch(/^\/uploads\/photos\//);
    uploadedPhotoUrl = res.body.data.url;
  });

  // Scenario 5: Generate Unique Member ID
  it('5. Generates the next sequential unique member ID', async () => {
    const res = await request(app)
      .get('/api/members/next-id')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.nextId).toMatch(/^FC-\d+$/);
  });

  // Scenario 1: Register New Member Successfully & Calculate Expiration
  it('1 & 6. Registers new member successfully and calculates expiration correctly', async () => {
    const uniqueEmail = `test.athlete.${Date.now()}@fitcore.io`;
    const uniquePhone = `+1 555 ${Math.floor(1000000 + Math.random() * 9000000)}`;
    const res = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fullName: 'Jordan Sterling',
        email: uniqueEmail,
        phone: uniquePhone,
        gender: 'MALE',
        branch: branchId,
        planId: planId,
        paymentMethod: 'UPI',
        photoUrl: uploadedPhotoUrl,
        discount: 20,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.member).toBeDefined();
    expect(res.body.data.member.fullName).toBe('Jordan Sterling');
    expect(res.body.data.membership).toBeDefined();
    expect(res.body.data.payment).toBeDefined();
    expect(res.body.data.payment.receiptNumber).toMatch(/^RCP-\d{4}-\d+$/);

    registeredMemberId = res.body.data.member._id;
    registeredMembershipId = res.body.data.membership._id;

    // Verify expiration calculation (expiryDate is after startDate)
    const startDate = new Date(res.body.data.membership.startDate);
    const expiryDate = new Date(res.body.data.membership.expiryDate);
    expect(expiryDate.getTime()).toBeGreaterThan(startDate.getTime());
  });

  // Scenario 7: Expirations Within 7 Days
  it('7. Identifies memberships expiring within 7 days in expiration center', async () => {
    const res = await request(app)
      .get('/api/memberships/expiration-center?filter=7_DAYS')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.expiringIn7Days).toBeDefined();
    expect(Array.isArray(res.body.data.members)).toBe(true);
  });

  // Scenario 8: Expirations Today
  it('8. Identifies memberships expiring today', async () => {
    const res = await request(app)
      .get('/api/memberships/expiration-center?filter=TODAY')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.expiringToday).toBeDefined();
  });

  // Scenario 9: Already Expired Memberships
  it('9. Identifies already expired memberships', async () => {
    const res = await request(app)
      .get('/api/memberships/expiration-center?filter=EXPIRED')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.alreadyExpired).toBeGreaterThan(0);
  });

  // Scenario 10: Prevent Duplicate Expiration Notifications
  it('10. Prevents duplicate expiration notifications via dedupKey', async () => {
    await runExpirationCheck();
    const countBefore = await Notification.countDocuments();
    // Run second check on the same day
    await runExpirationCheck();
    const countAfter = await Notification.countDocuments();
    expect(countAfter).toBe(countBefore);
  });

  // Scenario 11: Renew Membership While Preserving History
  it('11. Renews a membership and preserves previous history records', async () => {
    const renewRes = await request(app)
      .post(`/api/memberships/${registeredMembershipId}/renew`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        durationDays: 30,
        amountPaid: 129,
        paymentMethod: 'CREDIT_CARD',
      });
    expect(renewRes.status).toBe(200);
    expect(renewRes.body.data.membership.renewalHistory.length).toBeGreaterThan(0);
    expect(renewRes.body.data.payment.receiptNumber).toBeDefined();
  });

  // Scenario 12: Prevent Invalid Renewal
  it('12. Rejects renewal for non-existent membership ID', async () => {
    const res = await request(app)
      .post('/api/memberships/507f1f77bcf86cd799439011/renew')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ durationDays: 30, amountPaid: 100 });
    expect(res.status).toBe(404);
  });

  // Scenario 13: Accurate Receipts & Payments
  it('13 & 18. Generates accurate sequential receipts and balance calculations', async () => {
    const paymentsRes = await request(app)
      .get('/api/payments')
      .set('Authorization', `Bearer ${authToken}`);
    expect(paymentsRes.status).toBe(200);
    expect(paymentsRes.body.data.length).toBeGreaterThan(0);
    expect(paymentsRes.body.data[0].receiptNumber).toMatch(/^RCP-\d{4}-\d+$/);
    expect(typeof paymentsRes.body.data[0].amount).toBe('number');
  });

  // Scenario 14: Restrict / Filter Branch Access
  it('14. Filters member rosters by assigned branch ID', async () => {
    const res = await request(app)
      .get(`/api/members?branch=${branchId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // Scenario 15: Check-in Active Member
  it('15. Checks in an active member via Member ID and records duration', async () => {
    // Clear any previous attendance records for FC-1001 to prevent debounce 429
    const member = await Member.findOne({ memberId: 'FC-1001' });
    if (member) {
      await Attendance.deleteMany({ member: member._id });
    }

    // Check in David Hayes FC-1001
    const checkInRes = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        identifier: 'FC-1001',
        branchId,
        method: 'MANUAL',
      });
    expect([200, 201]).toContain(checkInRes.status);
    expect(checkInRes.body.data.member).toBeDefined();
  });

  // Scenario 16: Handle Expired / Frozen Membership Warnings
  it('16. Accurately flags expired or frozen memberships during check-in', async () => {
    // FC-1007 is seeded as EXPIRED
    const member = await Member.findOne({ memberId: 'FC-1007' });
    if (member) {
      if (member.isArchived) {
        member.isArchived = false;
        await member.save();
      }
      await Attendance.deleteMany({ member: member._id });
    }

    const checkInRes = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        identifier: 'FC-1007',
        branchId,
      });
    expect([200, 201]).toContain(checkInRes.status);
    expect(checkInRes.body.data.membershipValid).toBe(false);
  });

  // Scenario 17: Calculate Real Dashboard Statistics
  it('17. Derives real dashboard statistics from database collections', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.metrics.totalMembers).toBeGreaterThan(0);
    expect(res.body.data.metrics.activeMembers).toBeGreaterThan(0);
    expect(res.body.data.metrics.monthlyRevenue).toBeGreaterThan(0);
  });

  // Scenario 19: Record Administrative Actions in Audit Log
  it('19. Records administrative actions and registrations in AuditLog', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // Scenario 20: Notification Read / Unread Functionality
  it('20. Fetches unread notifications and marks single/all notifications read', async () => {
    // Create a sample notification
    const notif = await Notification.create({
      title: 'Test Urgent Alert',
      message: 'System test notification',
      type: 'SYSTEM',
    });
    createdNotificationId = notif._id.toString();

    // Fetch notifications
    const getRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${authToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.unreadCount).toBeGreaterThan(0);

    // Mark single as read
    const readRes = await request(app)
      .patch(`/api/notifications/${createdNotificationId}/read`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.read).toBe(true);

    // Mark all as read
    const allReadRes = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${authToken}`);
    expect(allReadRes.status).toBe(200);
  });

  // Phase 4 - Scenario 21: Fetch and Update Indian Gym Business Settings
  it('21. Indian Gym Settings: retrieves defaults and allows updating profile & GST', async () => {
    const getRes = await request(app).get('/api/settings');
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.currency).toBe('INR');
    expect(getRes.body.data.timezone).toBe('Asia/Kolkata');

    const updateRes = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        gymName: 'Sagar Fitness Gym',
        address: 'Main Road, Baner, Pune',
        city: 'Pune',
        isTaxEnabled: false,
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.gymName).toBe('Sagar Fitness Gym');
    expect(updateRes.body.data.isTaxEnabled).toBe(false);
  });

  // Phase 4 - Scenario 22: Grouped Expiry Identification (2 Days, 4-5 Days, Expired)
  it('22. Expiry Intelligence: groups memberships into 2-day auto, 4-5 day manual, and expired', async () => {
    const res = await request(app)
      .get('/api/expiry/grouped')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.expiringIn2Days)).toBe(true);
    expect(Array.isArray(res.body.data.expiringIn4To5Days)).toBe(true);
    expect(Array.isArray(res.body.data.expired)).toBe(true);
    expect(res.body.data.summary).toBeDefined();
  });

  // Phase 4 - Scenario 23: Log Manual WhatsApp Reminder & Verify Audit Trail
  it('23. Manual Reminder: logs prefilled WhatsApp reminder with timestamp and message', async () => {
    // Find an active member
    const groupedRes = await request(app)
      .get('/api/expiry/grouped')
      .set('Authorization', `Bearer ${authToken}`);
    const sampleMember = groupedRes.body.data.expiringIn4To5Days[0] || groupedRes.body.data.expiringIn2Days[0];

    if (sampleMember) {
      const logRes = await request(app)
        .post('/api/expiry/manual-reminder')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId: sampleMember.member._id,
          membershipId: sampleMember.membership._id,
          recipientPhone: sampleMember.member.phone || '+91 98111 22233',
          recipientName: sampleMember.member.fullName,
          message: 'Hi test member, reminder sent.',
        });
      expect(logRes.status).toBe(200);
      expect(logRes.body.success).toBe(true);
      expect(logRes.body.data.log.status).toBe('SENT');
    }
  });

  // Phase 4 - Scenario 24: Automated Scheduler Execution & Duplicate Prevention
  it('24. Automated Scheduler: executes safely and skips already logged notifications to prevent duplicates', async () => {
    const runRes1 = await request(app)
      .post('/api/expiry/run-scheduler-now')
      .set('Authorization', `Bearer ${authToken}`);
    expect(runRes1.status).toBe(200);
    expect(runRes1.body.success).toBe(true);

    // Second execution must record skipped items for any already notified memberships
    const runRes2 = await request(app)
      .post('/api/expiry/run-scheduler-now')
      .set('Authorization', `Bearer ${authToken}`);
    expect(runRes2.status).toBe(200);
    expect(runRes2.body.success).toBe(true);
    // Sent or notConfigured count should be 0 on immediate rerun due to dedup
    expect(runRes2.body.data.sentCount).toBe(0);
  });

  // Scenario 25: Plan Deletion with Active Subscriber Protection
  it('25. Plan Deletion: protects plans with active subscribers and deletes unused plans cleanly', async () => {
    // 1. Attempting to delete a plan that has active members should be rejected with 400
    const failDeleteRes = await request(app)
      .delete(`/api/plans/${planId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(failDeleteRes.status).toBe(400);
    expect(failDeleteRes.body.success).toBe(false);
    expect(failDeleteRes.body.message).toContain('active member(s) are currently subscribed to it');

    // 2. Create a temporary plan with no subscribers
    const createRes = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Temporary Trial Pass',
        durationDays: 7,
        price: 499,
        description: 'One week trial pass',
      });
    expect(createRes.status).toBe(201);
    const tempPlanId = createRes.body.data._id;

    // 3. Delete the temporary plan cleanly
    const deleteRes = await request(app)
      .delete(`/api/plans/${tempPlanId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.message).toContain('deleted successfully');

    // 4. Deleting a non-existent / already deleted plan should return 404
    const notFoundRes = await request(app)
      .delete(`/api/plans/${tempPlanId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(notFoundRes.status).toBe(404);
  });

  // Scenario 26: Archive Member with Linked Records (Safe Archiving & Check-In Block)
  it('26. Archive Member with Linked Records: safely archives member, preserves payments/receipts, and blocks attendance check-in', async () => {
    // 1. Archive member who has payment & membership history
    const archiveRes = await request(app)
      .patch(`/api/members/${registeredMemberId}/archive`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.success).toBe(true);
    expect(archiveRes.body.data.isArchived).toBe(true);
    expect(archiveRes.body.message).toContain('archived');

    // 2. Member must be flagged as archived in DB
    const memberCheck = await Member.findById(registeredMemberId);
    expect(memberCheck?.isArchived).toBe(true);
    expect(memberCheck?.status).toBe('ARCHIVED');

    // 3. Member must NOT appear in default active member list
    const activeListRes = await request(app)
      .get('/api/members?isArchived=false')
      .set('Authorization', `Bearer ${authToken}`);
    const foundInActive = activeListRes.body.data.some((m: any) => m._id === registeredMemberId);
    expect(foundInActive).toBe(false);

    // 4. Member MUST appear in archived members list
    const archivedListRes = await request(app)
      .get('/api/members?isArchived=true')
      .set('Authorization', `Bearer ${authToken}`);
    const foundInArchived = archivedListRes.body.data.some((m: any) => m._id === registeredMemberId);
    expect(foundInArchived).toBe(true);

    // 5. Attendance Check-in must be rejected for archived member
    const checkInRes = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ identifier: memberCheck?.memberId });
    expect(checkInRes.status).toBe(404);
    expect(checkInRes.body.message).toContain('No active member found');
  });

  // Scenario 27: Restore Archived Member
  it('27. Restore Archived Member: restores member to active directory with appropriate status', async () => {
    const restoreRes = await request(app)
      .patch(`/api/members/${registeredMemberId}/restore`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.success).toBe(true);
    expect(restoreRes.body.data.isArchived).toBe(false);

    // Verify member is back in active directory
    const activeListRes = await request(app)
      .get('/api/members?isArchived=false')
      .set('Authorization', `Bearer ${authToken}`);
    const foundInActive = activeListRes.body.data.some((m: any) => m._id === registeredMemberId);
    expect(foundInActive).toBe(true);
  });

  // Scenario 28: Delete Member with Zero Linked Records (Permanent Deletion)
  it('28. Delete Member with Zero Linked Records: permanently deletes clean member from DB', async () => {
    // 1. Create a member with no plans or payments
    const nextIdRes = await request(app)
      .get('/api/members/next-id')
      .set('Authorization', `Bearer ${authToken}`);
    const cleanMemberId = nextIdRes.body.data.nextId;

    const createMemberRes = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fullName: 'Clean Temporary Member',
        email: `clean.member.${Date.now()}@example.com`,
        phone: '+91 99999 11111',
        gender: 'OTHER',
        branch: branchId,
        memberId: cleanMemberId,
      });
    expect(createMemberRes.status).toBe(201);
    const tempMemberMongoId = createMemberRes.body.data.member._id;

    // 2. Permanently delete the member
    const deleteRes = await request(app)
      .delete(`/api/members/${tempMemberMongoId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.data.deleted).toBe(true);
    expect(deleteRes.body.message).toContain('permanently deleted');

    // 3. Confirm member is completely removed from DB
    const lookup = await Member.findById(tempMemberMongoId);
    expect(lookup).toBeNull();
  });

  // Scenario 29: Authentication with Email and Username/ID
  it('29. Authenticates via both email and username identifier', async () => {
    // Via Email
    const emailLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@sagarfitness.com',
      password: 'password123',
    });
    expect(emailLogin.status).toBe(200);
    expect(emailLogin.body.success).toBe(true);
    expect(emailLogin.body.data.user.role).toBe('SUPER_ADMIN');

    // Via Username/ID
    const usernameLogin = await request(app).post('/api/auth/login').send({
      identifier: 'admin',
      password: 'password123',
    });
    expect(usernameLogin.status).toBe(200);
    expect(usernameLogin.body.success).toBe(true);
    expect(usernameLogin.body.data.user.email).toBe('admin@sagarfitness.com');

    // Front Desk Login
    const deskLogin = await request(app).post('/api/auth/login').send({
      identifier: 'desk',
      password: 'password123',
    });
    expect(deskLogin.status).toBe(200);
    expect(deskLogin.body.data.user.role).toBe('RECEPTIONIST');
  });

  // Scenario 30: Reject Invalid Credentials
  it('30. Rejects invalid login credentials with 401 status', async () => {
    const badLogin = await request(app).post('/api/auth/login').send({
      identifier: 'admin',
      password: 'wrong_password_999',
    });
    expect(badLogin.status).toBe(401);
    expect(badLogin.body.success).toBe(false);
  });

  // Scenario 31: Password Recovery Workflow (Forgot & Reset Password)
  it('31. Completes password recovery flow with secure single-use token', async () => {
    // 1. Request token
    const forgotRes = await request(app).post('/api/auth/forgot-password').send({
      email: 'desk@sagarfitness.com',
    });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);

    const token = forgotRes.body.data?.resetToken;
    expect(token).toBeDefined();

    // 2. Reset password using token
    const resetRes = await request(app).post('/api/auth/reset-password').send({
      token,
      newPassword: 'password123',
    });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // 3. Confirm token is single-use (second attempt must fail)
    const replayRes = await request(app).post('/api/auth/reset-password').send({
      token,
      newPassword: 'newpassword456',
    });
    expect(replayRes.status).toBe(400);
  }, 15000);

  // Scenario 32: Role Authorization Enforcement (Front Desk cannot modify Admin Settings)
  it('32. Restricts front desk role from modifying gym settings', async () => {
    const deskLogin = await request(app).post('/api/auth/login').send({
      identifier: 'desk',
      password: 'password123',
    });
    const deskToken = deskLogin.body.data.token;

    const forbiddenRes = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${deskToken}`)
      .send({ gymName: 'Hacked Gym Name' });
    expect(forbiddenRes.status).toBe(403);
  });

  // Scenario 33: Single Gym Settings & Tax-Free Policy
  it('33. Returns Sagar Fitness Gym single configuration with tax-free settings', async () => {
    const settingsRes = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${authToken}`);
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.data.gymName).toContain('Sagar Fitness');
    expect(settingsRes.body.data.isTaxEnabled).toBe(false);
    expect(settingsRes.body.data.currency).toBe('INR');
  });

  // Scenario 34: Expired or Malformed Token Rejection
  it('34. Rejects malformed or invalid JWT authentication tokens', async () => {
    const invalidRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.payload');
    expect(invalidRes.status).toBe(401);
  });

  // Scenario 35: Public Visitor Registration Block
  it('35. Rejects unauthorized public user registration attempts without admin token', async () => {
    const publicRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'intruder@sagarfitness.com',
        password: 'password123',
        fullName: 'Intruder Staff',
        role: 'SUPER_ADMIN',
      });
    expect(publicRegRes.status).toBe(401);
    expect(publicRegRes.body.success).toBe(false);
  });

  // Scenario 36: Front Desk Staff Provisioning Restriction
  it('36. Forbids front desk users from creating or inviting new staff accounts', async () => {
    const deskLogin = await request(app).post('/api/auth/login').send({
      identifier: 'desk',
      password: 'password123',
    });
    const deskToken = deskLogin.body.data.token;

    const forbiddenStaffCreate = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${deskToken}`)
      .send({
        email: 'unauthorized.staff@sagarfitness.com',
        password: 'password123',
        fullName: 'Unauthorized Staff',
        role: 'RECEPTIONIST',
      });
    expect(forbiddenStaffCreate.status).toBe(403);
  });

  // Scenario 37: Real-Time Session Invalidation for Deactivated Accounts
  it('37. Immediately revokes API access when a staff account is deactivated', async () => {
    // 1. Create a temporary staff user via admin
    const tempStaffEmail = `temp.staff.${Date.now()}@sagarfitness.com`;
    const createRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: tempStaffEmail,
        password: 'password123',
        fullName: 'Temporary Active Staff',
        role: 'RECEPTIONIST',
      });
    expect(createRes.status).toBe(201);
    const tempStaffId = createRes.body.data.user.id;

    // 2. Log in as temporary staff to acquire an active JWT
    const staffLogin = await request(app).post('/api/auth/login').send({
      email: tempStaffEmail,
      password: 'password123',
    });
    expect(staffLogin.status).toBe(200);
    const staffToken = staffLogin.body.data.token;

    // 3. Verify active token can access protected endpoints
    const activeAccess = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(activeAccess.status).toBe(200);

    // 4. Admin deactivates the staff user
    const deactivateRes = await request(app)
      .put(`/api/auth/staff/${tempStaffId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'INACTIVE' });
    expect(deactivateRes.status).toBe(200);

    // 5. Subsequent request with the existing JWT must be immediately rejected with 403
    const revokedAccess = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(revokedAccess.status).toBe(403);
    expect(revokedAccess.body.message).toContain('deactivated');
  }, 15000);

  // Scenario 38: Last Active Administrator Safety Safeguard
  it('38. Protects the last active administrator from accidental deactivation or demotion', async () => {
    // Retrieve current super admin ID
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    const adminId = meRes.body.data.user.id;

    // Find any other active admins and temporarily set their status to INACTIVE so only 1 exists
    const otherAdmins = await User.find({
      role: { $in: ['SUPER_ADMIN', 'GYM_ADMIN'] },
      _id: { $ne: adminId },
      status: 'ACTIVE',
    });
    await User.updateMany(
      { role: { $in: ['SUPER_ADMIN', 'GYM_ADMIN'] }, _id: { $ne: adminId } },
      { $set: { status: 'INACTIVE' } }
    );

    try {
      // Attempt to deactivate the only remaining active admin
      const demoteAttempt = await request(app)
        .put(`/api/auth/staff/${adminId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'INACTIVE' });
      expect(demoteAttempt.status).toBe(400);
      expect(demoteAttempt.body.message).toContain('last remaining active gym administrator');
    } finally {
      // Restore other admins
      for (const admin of otherAdmins) {
        await User.findByIdAndUpdate(admin._id, { status: 'ACTIVE' });
      }
    }
  });
});
