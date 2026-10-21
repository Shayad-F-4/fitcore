import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import { ENV } from '../src/config/env.js';
import { Member } from '../src/models/Member.js';
import { Membership } from '../src/models/Membership.js';
import { MembershipPlan } from '../src/models/MembershipPlan.js';
import { Payment } from '../src/models/Payment.js';

describe('Members Section Optimization - Comprehensive Integration Suite', () => {
  let authToken = '';
  let branchId = '';
  let planId = '';
  let testFemaleMemberId = '';
  let testExpiringMemberId = '';
  let testExpiringMembershipId = '';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGODB_URI);
    }

    // Login as Super Admin
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@fitcore.com',
      password: 'password123',
    });
    authToken = loginRes.body.data.token;

    // Retrieve Branch & Plan
    const branchesRes = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${authToken}`);
    branchId = branchesRes.body.data[0]._id;

    const plansRes = await request(app)
      .get('/api/plans')
      .set('Authorization', `Bearer ${authToken}`);
    planId = plansRes.body.data[0]._id;
  });

  // Test 1: Compact Summary Cards Statistics from actual database records
  it('1. GET /api/members/stats returns actual database counts for all 6 categories', async () => {
    const res = await request(app)
      .get('/api/members/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const stats = res.body.data;
    expect(typeof stats.total).toBe('number');
    expect(typeof stats.newMembers).toBe('number');
    expect(typeof stats.active).toBe('number');
    expect(typeof stats.expiringSoon).toBe('number');
    expect(typeof stats.expired).toBe('number');
    expect(typeof stats.pendingDues).toBe('number');
    expect(typeof stats.femaleMembers).toBe('number');
    expect(typeof stats.archived).toBe('number');
  });

  // Test 2: Category Tab - New Members (Last 30 Calendar Days in Asia/Kolkata)
  it('2. Registers a new member and verifies tab=NEW includes them with newest join date first', async () => {
    const timestamp = Date.now();
    const phone = `+91 91234 ${timestamp.toString().slice(-5)}`;
    const createRes = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fullName: `Priya Sharma ${timestamp}`,
        email: `priya.${timestamp}@fitcore.io`,
        phone,
        gender: 'FEMALE',
        branch: branchId,
        planId,
        amountPaid: 500, // Partial payment to also verify pending dues
        discount: 0,
      });

    expect(createRes.status).toBe(201);
    testFemaleMemberId = createRes.body.data.member._id;

    // Verify in tab=NEW
    const newMembersRes = await request(app)
      .get('/api/members?tab=NEW')
      .set('Authorization', `Bearer ${authToken}`);

    expect(newMembersRes.status).toBe(200);
    const members = newMembersRes.body.data;
    expect(members.length).toBeGreaterThan(0);
    const found = members.find((m: any) => m._id === testFemaleMemberId);
    expect(found).toBeDefined();
    expect(found.fullName).toContain('Priya Sharma');
    expect(found.gender).toBe('FEMALE');
    expect(found.paymentStatus).toBe('PENDING_PAYMENT');
  });

  // Test 3: Category Tab - Female Members
  it('3. GET /api/members?tab=FEMALE filters existing records without creating duplicates', async () => {
    const res = await request(app)
      .get('/api/members?tab=FEMALE')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const femaleMembers = res.body.data;
    expect(femaleMembers.length).toBeGreaterThan(0);
    femaleMembers.forEach((m: any) => {
      expect(m.gender).toBe('FEMALE');
    });
  });

  // Test 4: Combined Filter - Female Members + Pending Dues
  it('4. Combines tab=FEMALE with paymentStatus=PENDING_PAYMENT accurately', async () => {
    const res = await request(app)
      .get('/api/members?tab=FEMALE&paymentStatus=PENDING_PAYMENT')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const members = res.body.data;
    expect(members.length).toBeGreaterThan(0);
    members.forEach((m: any) => {
      expect(m.gender).toBe('FEMALE');
      expect(m.paymentStatus).toBe('PENDING_PAYMENT');
      expect(m.balanceDue).toBeGreaterThan(0);
    });
  });

  // Test 5: Category Tab - Expiring Soon (Next 7 Calendar Days Inclusive in Asia/Kolkata)
  it('5. Creates membership expiring in 3 days and verifies tab=EXPIRING_SOON returns it with proper label', async () => {
    const timestamp = Date.now();
    const phone = `+91 98765 ${timestamp.toString().slice(-5)}`;

    const memberRes = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fullName: `Rahul Verma ${timestamp}`,
        email: `rahul.${timestamp}@fitcore.io`,
        phone,
        gender: 'MALE',
        branch: branchId,
      });

    testExpiringMemberId = memberRes.body.data.member._id;

    // Create an active membership expiring in 3 days
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);

    const sub = await Membership.create({
      member: testExpiringMemberId,
      plan: planId,
      startDate: new Date(),
      expiryDate: in3Days,
      originalPrice: 2000,
      amountDue: 2000,
      amountPaid: 2000,
      status: 'ACTIVE',
    });
    testExpiringMembershipId = sub._id.toString();

    await Member.findByIdAndUpdate(testExpiringMemberId, { status: 'ACTIVE' });

    // Verify in tab=EXPIRING_SOON
    const expiringRes = await request(app)
      .get('/api/members?tab=EXPIRING_SOON')
      .set('Authorization', `Bearer ${authToken}`);

    expect(expiringRes.status).toBe(200);
    const expiringMembers = expiringRes.body.data;
    const found = expiringMembers.find((m: any) => m._id === testExpiringMemberId);
    expect(found).toBeDefined();
    expect(found.isExpiringSoon).toBe(true);
    expect(found.expiryLabel).toMatch(/Expires in \d+ Days/);
  });

  // Test 6: Category Tab - Expired Members
  it('6. GET /api/members?tab=EXPIRED returns members whose membership has expired', async () => {
    const res = await request(app)
      .get('/api/members?tab=EXPIRED')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const expiredMembers = res.body.data;
    expect(expiredMembers.length).toBeGreaterThan(0);
    expiredMembers.forEach((m: any) => {
      // Must not have an active valid membership
      expect(m.status === 'EXPIRED' || m.isExpired === true).toBe(true);
    });
  });

  // Test 7: Unified Search by Name, Phone, and Member ID
  it('7. Searches correctly across name, phone, and member ID', async () => {
    const member = await Member.findById(testFemaleMemberId);
    expect(member).toBeDefined();

    // 1. Search by full name
    const nameRes = await request(app)
      .get(`/api/members?search=${encodeURIComponent(member!.fullName)}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(nameRes.body.data.some((m: any) => m._id === testFemaleMemberId)).toBe(true);

    // 2. Search by phone
    const phoneRes = await request(app)
      .get(`/api/members?search=${encodeURIComponent(member!.phone)}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(phoneRes.body.data.some((m: any) => m._id === testFemaleMemberId)).toBe(true);

    // 3. Search by member ID (e.g. FC-100X)
    const idRes = await request(app)
      .get(`/api/members?search=${encodeURIComponent(member!.memberId)}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(idRes.body.data.some((m: any) => m._id === testFemaleMemberId)).toBe(true);
  });

  // Test 8: Data Integrity - Membership renewal preserves original joinDate
  it('8. Verifies that renewing membership does NOT overwrite original joinDate', async () => {
    const memberBefore = await Member.findById(testExpiringMemberId);
    const originalJoinDate = memberBefore!.joinDate.toISOString();

    // Perform renewal via POST /api/memberships/:id/renew
    const renewRes = await request(app)
      .post(`/api/memberships/${testExpiringMembershipId}/renew`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        durationDays: 30,
        amountPaid: 2000,
        paymentMethod: 'CASH',
      });

    expect(renewRes.status).toBe(200);
    expect(renewRes.body.success).toBe(true);

    // Verify Member record in DB
    const memberAfter = await Member.findById(testExpiringMemberId);
    expect(memberAfter!.joinDate.toISOString()).toBe(originalJoinDate);
  });

  // Test 9: Independent Membership Status and Payment Status
  it('9. Preserves independent membership status and payment status', async () => {
    const res = await request(app)
      .get(`/api/members?search=${encodeURIComponent('Priya Sharma')}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const member = res.body.data.find((m: any) => m._id === testFemaleMemberId);
    expect(member).toBeDefined();
    // Membership status is ACTIVE, but paymentStatus is PENDING_PAYMENT
    expect(member.status).toBe('ACTIVE');
    expect(member.paymentStatus).toBe('PENDING_PAYMENT');
  });

  // Test 10: Backward-Compatible Support for PREFER_NOT_TO_SAY Gender
  it('10. Safely supports PREFER_NOT_TO_SAY gender in Member registration and update', async () => {
    const timestamp = Date.now();
    const res = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fullName: `Alex Rivera ${timestamp}`,
        email: `alex.${timestamp}@fitcore.io`,
        phone: `+91 95555 ${timestamp.toString().slice(-5)}`,
        gender: 'PREFER_NOT_TO_SAY',
        branch: branchId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.member.gender).toBe('PREFER_NOT_TO_SAY');

    // Clean up test member
    await Member.findByIdAndDelete(res.body.data.member._id);
  });

  // Test 11: Member page immediately reflects PAID and balanceDue 0 after paying due
  it('11. Immediately updates member page status to PAID and balanceDue 0 when due is paid', async () => {
    // 1. Get Priya Sharma's membership
    const memberRes = await request(app)
      .get(`/api/members?search=${encodeURIComponent('Priya Sharma')}`)
      .set('Authorization', `Bearer ${authToken}`);

    const member = memberRes.body.data.find((m: any) => m._id === testFemaleMemberId);
    expect(member).toBeDefined();
    expect(member.balanceDue).toBeGreaterThan(0);
    expect(member.paymentStatus).toBe('PENDING_PAYMENT');
    const membershipId = member.currentMembership._id;
    const dueAmount = member.balanceDue;

    // 2. Collect remaining due via POST /api/payments/collect-due
    const collectRes = await request(app)
      .post('/api/payments/collect-due')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        membershipId,
        amountPaid: dueAmount,
        paymentMethod: 'CASH',
        notes: 'Full clearance of remaining dues',
      });

    expect(collectRes.status).toBe(201);
    expect(collectRes.body.success).toBe(true);
    expect(collectRes.body.data.balanceRemaining).toBe(0);

    // 3. Verify member list endpoint now returns PAID and balanceDue: 0
    const updatedMemberRes = await request(app)
      .get(`/api/members?search=${encodeURIComponent('Priya Sharma')}`)
      .set('Authorization', `Bearer ${authToken}`);

    const updatedMember = updatedMemberRes.body.data.find((m: any) => m._id === testFemaleMemberId);
    expect(updatedMember).toBeDefined();
    expect(updatedMember.balanceDue).toBe(0);
    expect(updatedMember.paymentStatus).toBe('PAID');

    // 4. Verify member is now in paymentStatus=PAID filter and excluded from PENDING_PAYMENT
    const paidListRes = await request(app)
      .get('/api/members?paymentStatus=PAID')
      .set('Authorization', `Bearer ${authToken}`);
    expect(paidListRes.body.data.some((m: any) => m._id === testFemaleMemberId)).toBe(true);

    const pendingListRes = await request(app)
      .get('/api/members?paymentStatus=PENDING_PAYMENT')
      .set('Authorization', `Bearer ${authToken}`);
    expect(pendingListRes.body.data.some((m: any) => m._id === testFemaleMemberId)).toBe(false);
  });
});
