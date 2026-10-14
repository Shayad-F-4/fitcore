import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { Branch } from '../models/Branch.js';
import { MembershipPlan } from '../models/MembershipPlan.js';
import { Member } from '../models/Member.js';
import { Membership } from '../models/Membership.js';
import { Payment } from '../models/Payment.js';
import { Attendance } from '../models/Attendance.js';
import { AuditLog } from '../models/AuditLog.js';

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await mongoose.connect(ENV.MONGODB_URI);
    console.log('[Seed] Connected.');

    // Clear existing collections
    console.log('[Seed] Cleaning old records...');
    await Promise.all([
      User.deleteMany({}),
      Branch.deleteMany({}),
      MembershipPlan.deleteMany({}),
      Member.deleteMany({}),
      Membership.deleteMany({}),
      Payment.deleteMany({}),
      Attendance.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    // 1. Create Branches
    console.log('[Seed] Creating branches...');
    const downtown = await Branch.create({
      name: 'FitCore Flagship Downtown',
      code: 'FC-DTN',
      address: '742 Evergreen Boulevard',
      city: 'Metropolis',
      phone: '+1 (555) 019-2834',
      email: 'downtown@fitcore.com',
      openingHours: 'Mon-Sun: 05:00 AM - 11:30 PM',
      capacity: 250,
      status: 'ACTIVE',
    });

    const uptown = await Branch.create({
      name: 'FitCore Uptown Performance Lab',
      code: 'FC-UPT',
      address: '108 Grand Avenue, 4th Floor',
      city: 'Metropolis',
      phone: '+1 (555) 014-9921',
      email: 'uptown@fitcore.com',
      openingHours: 'Mon-Sat: 06:00 AM - 10:00 PM',
      capacity: 180,
      status: 'ACTIVE',
    });

    const westside = await Branch.create({
      name: 'FitCore Westside Athlete Club',
      code: 'FC-WST',
      address: '330 Ocean Drive',
      city: 'Metropolis',
      phone: '+1 (555) 017-7422',
      email: 'westside@fitcore.com',
      openingHours: '24 Hours / 7 Days',
      capacity: 200,
      status: 'ACTIVE',
    });

    // 2. Create Users
    console.log('[Seed] Creating staff & admin users...');
    const adminUser = await User.create({
      email: 'admin@fitcore.com',
      password: 'password123',
      fullName: 'Alex Vance',
      role: 'SUPER_ADMIN',
      phone: '+1 (555) 100-0001',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    });

    const managerUser = await User.create({
      email: 'manager@fitcore.com',
      password: 'password123',
      fullName: 'Marcus Sterling',
      role: 'GYM_ADMIN',
      phone: '+1 (555) 100-0002',
      branch: downtown._id,
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    });

    const receptionistUser = await User.create({
      email: 'reception@fitcore.com',
      password: 'password123',
      fullName: 'Sarah Jenkins',
      role: 'RECEPTIONIST',
      phone: '+1 (555) 100-0003',
      branch: downtown._id,
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    });

    const trainerUser = await User.create({
      email: 'trainer@fitcore.com',
      password: 'password123',
      fullName: 'Elena Rostova',
      role: 'TRAINER',
      phone: '+1 (555) 100-0004',
      branch: downtown._id,
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    });

    // 3. Create Membership Plans
    console.log('[Seed] Creating membership plans...');
    const plans = await MembershipPlan.insertMany([
      {
        name: 'Elite All-Access VIP',
        type: 'ANNUAL',
        durationDays: 365,
        price: 1299,
        description: 'Unrestricted premium access to all FitCore locations with VIP recovery lounge and personalized coaching.',
        features: [
          'All 3 FitCore Locations Access',
          'Unlimited Sauna, Cold Plunge & Recovery',
          'Monthly Guest Passes (x2)',
          'Complimentary Towel & Dedicated Locker',
          '4 Personal Training Sessions Included',
          'InBody 570 Biometric Scans',
        ],
        active: true,
        isPopular: true,
        badge: 'MOST POPULAR',
      },
      {
        name: 'Pro Strength & Conditioning',
        type: 'QUARTERLY',
        durationDays: 90,
        price: 349,
        description: 'Engineered for dedicated athletes seeking heavy free weights, Olympic lifting platforms, and functional turf.',
        features: [
          'Downtown & Uptown Access',
          'Olympic Lifting & Eleiko Platforms',
          'Functional Turf & Rig Zones',
          'FitCore Mobile App Workout Logger',
          'Monthly Body Composition Scan',
        ],
        active: true,
        isPopular: false,
        badge: 'ATHLETE CHOICE',
      },
      {
        name: 'Classic Fitness',
        type: 'MONTHLY',
        durationDays: 30,
        price: 129,
        description: 'Our core membership providing unlimited high-tech cardio, pin-loaded selectorized machines, and locker access.',
        features: [
          'Single Branch Access',
          'Matrix Cardio & Strength Machines',
          'Shower & Changing Facilities',
          'High-Speed Wi-Fi',
        ],
        active: true,
        isPopular: false,
        badge: 'FLEXIBLE',
      },
      {
        name: 'CrossFit & Functional Box Pass',
        type: 'MONTHLY',
        durationDays: 30,
        price: 179,
        description: 'Full coaching, daily WODs, endurance circuits, and open gym hours in our dedicated functional box.',
        features: [
          'Unlimited Daily WOD Classes',
          'Certified CrossFit Coaches',
          'Heart-Rate Monitor Sync',
          'Competition Prep Clinics',
        ],
        active: true,
        isPopular: false,
        badge: 'COMMUNITY',
      },
      {
        name: '10-Day Athlete Flex Pass',
        type: 'DAY_PASS',
        durationDays: 60,
        price: 99,
        description: '10 flexible drop-in gym sessions valid across any 60-day window. Perfect for frequent travelers.',
        features: [
          '10 Full-Day Gym Passes',
          'Valid for 60 Days',
          'Access to Any Branch',
          'Includes Locker & Showers',
        ],
        active: true,
        isPopular: false,
        badge: 'ON-THE-GO',
      },
    ]);

    const vipPlan = plans[0];
    const quarterlyPlan = plans[1];
    const monthlyPlan = plans[2];
    const crossfitPlan = plans[3];

    // 4. Create Members
    console.log('[Seed] Creating members...');
    const membersData = [
      {
        memberId: 'FC-1001',
        fullName: 'David Hayes',
        email: 'david.hayes@example.com',
        phone: '+1 (555) 234-5678',
        gender: 'MALE',
        dob: new Date('1992-05-14'),
        address: '142 Pine Street, Apt 4B',
        branch: downtown._id,
        fitnessGoals: ['Hypertrophy', 'Strength', 'Deadlift 500lbs'],
        photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1001_DH89',
        status: 'ACTIVE',
        plan: vipPlan,
        expiryDaysFromNow: 180,
      },
      {
        memberId: 'FC-1002',
        fullName: 'Sophia Laurent',
        email: 'sophia.l@example.com',
        phone: '+1 (555) 876-5432',
        gender: 'FEMALE',
        dob: new Date('1996-09-21'),
        address: '88 Riverview Terrace',
        branch: downtown._id,
        fitnessGoals: ['Functional Mobility', 'Fat Loss', 'HIIT'],
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1002_SL92',
        status: 'ACTIVE',
        plan: crossfitPlan,
        expiryDaysFromNow: 4, // EXPIRING SOON!
      },
      {
        memberId: 'FC-1003',
        fullName: 'Liam Thorne',
        email: 'liam.thorne@example.com',
        phone: '+1 (555) 345-6789',
        gender: 'MALE',
        dob: new Date('1988-11-03'),
        address: '512 Oakwood Lane',
        branch: uptown._id,
        fitnessGoals: ['Olympic Weightlifting', 'Powerlifting'],
        photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1003_LT45',
        status: 'ACTIVE',
        plan: quarterlyPlan,
        expiryDaysFromNow: 45,
      },
      {
        memberId: 'FC-1004',
        fullName: 'Maya Chen',
        email: 'maya.chen@example.com',
        phone: '+1 (555) 901-2345',
        gender: 'FEMALE',
        dob: new Date('1994-03-18'),
        address: '220 Beacon St, Suite 12',
        branch: downtown._id,
        fitnessGoals: ['Marathon Prep', 'Cardio Endurance', 'Core Strength'],
        photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1004_MC78',
        status: 'ACTIVE',
        plan: monthlyPlan,
        expiryDaysFromNow: 2, // EXPIRING VERY SOON!
      },
      {
        memberId: 'FC-1005',
        fullName: 'Jordan Taylor',
        email: 'jordan.t@example.com',
        phone: '+1 (555) 678-9012',
        gender: 'OTHER',
        dob: new Date('1997-07-29'),
        address: '67 High St',
        branch: westside._id,
        fitnessGoals: ['Calisthenics', 'Agility'],
        photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1005_JT11',
        status: 'FROZEN',
        plan: quarterlyPlan,
        expiryDaysFromNow: 20,
      },
      {
        memberId: 'FC-1006',
        fullName: 'Carlos Mendez',
        email: 'carlos.m@example.com',
        phone: '+1 (555) 432-1098',
        gender: 'MALE',
        dob: new Date('1985-02-12'),
        address: '390 Sunset Blvd',
        branch: downtown._id,
        fitnessGoals: ['Cardiovascular Health', 'Weight Management'],
        photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1006_CM33',
        status: 'ACTIVE',
        plan: vipPlan,
        expiryDaysFromNow: 240,
      },
      {
        memberId: 'FC-1007',
        fullName: 'Emma Watson-Reid',
        email: 'emma.wr@example.com',
        phone: '+1 (555) 567-8901',
        gender: 'FEMALE',
        dob: new Date('1999-12-05'),
        address: '15 Maple Court',
        branch: uptown._id,
        fitnessGoals: ['Pilates', 'Strength', 'Flexibility'],
        photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1007_EW88',
        status: 'EXPIRED',
        plan: monthlyPlan,
        expiryDaysFromNow: -5, // EXPIRED
      },
      {
        memberId: 'FC-1008',
        fullName: 'Ryan Brooks',
        email: 'ryan.b@example.com',
        phone: '+1 (555) 210-9876',
        gender: 'MALE',
        dob: new Date('1991-08-16'),
        address: '77 Ironworks Way',
        branch: downtown._id,
        fitnessGoals: ['Arm Size', 'Bench Press', 'Athleticism'],
        photoUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1008_RB55',
        status: 'ACTIVE',
        plan: crossfitPlan,
        expiryDaysFromNow: 18,
      },
    ];

    const createdMembers = [];
    let receiptCounter = 5001;

    for (const m of membersData) {
      const joinDate = new Date();
      joinDate.setDate(joinDate.getDate() - 45);

      const member = await Member.create({
        memberId: m.memberId,
        fullName: m.fullName,
        email: m.email,
        phone: m.phone,
        gender: m.gender as any,
        dob: m.dob,
        address: m.address,
        branch: m.branch,
        fitnessGoals: m.fitnessGoals,
        photoUrl: m.photoUrl,
        qrCodeToken: m.qrCodeToken,
        status: m.status as any,
        joinDate,
        isArchived: false,
      });
      createdMembers.push(member);

      // Create Membership
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (m.plan.durationDays - m.expiryDaysFromNow));
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + m.expiryDaysFromNow);

      const membership = await Membership.create({
        member: member._id,
        plan: m.plan._id,
        startDate,
        expiryDate,
        originalPrice: m.plan.price,
        discount: 0,
        amountDue: m.plan.price,
        amountPaid: m.plan.price,
        status: m.status === 'FROZEN' ? 'FROZEN' : m.expiryDaysFromNow < 0 ? 'EXPIRED' : 'ACTIVE',
        freezeHistory:
          m.status === 'FROZEN'
            ? [
                {
                  fromDate: new Date(Date.now() - 7 * 24 * 3600 * 1000),
                  toDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
                  reason: 'Business travel & shoulder recovery',
                },
              ]
            : [],
      });

      // Create Payment
      receiptCounter++;
      const paymentMethods = ['UPI', 'CREDIT_CARD', 'CASH', 'DEBIT_CARD'];
      const chosenMethod = paymentMethods[receiptCounter % paymentMethods.length];

      await Payment.create({
        receiptNumber: `RCP-2026-${receiptCounter}`,
        member: member._id,
        membership: membership._id,
        amount: m.plan.price,
        paymentMethod: chosenMethod as any,
        status: 'PAID',
        type: 'MEMBERSHIP',
        balanceRemaining: 0,
        notes: `Full payment for ${m.plan.name}`,
        recordedBy: receptionistUser._id,
        paymentDate: startDate,
      });
    }

    // 5. Create Attendance Records for Today
    console.log('[Seed] Creating realistic attendance and live occupancy...');
    const now = new Date();

    // Member 1: Checked in 45 mins ago, still inside!
    const in45m = new Date(now.getTime() - 45 * 60 * 1000);
    await Attendance.create({
      member: createdMembers[0]._id, // David Hayes
      branch: downtown._id,
      checkInTime: in45m,
      method: 'QR_CODE',
      checkedInBy: receptionistUser._id,
    });

    // Member 2: Checked in 20 mins ago, still inside!
    const in20m = new Date(now.getTime() - 20 * 60 * 1000);
    await Attendance.create({
      member: createdMembers[1]._id, // Sophia Laurent
      branch: downtown._id,
      checkInTime: in20m,
      method: 'MANUAL',
      checkedInBy: receptionistUser._id,
    });

    // Member 6: Checked in 90 mins ago, still inside!
    const in90m = new Date(now.getTime() - 90 * 60 * 1000);
    await Attendance.create({
      member: createdMembers[5]._id, // Carlos Mendez
      branch: downtown._id,
      checkInTime: in90m,
      method: 'QR_CODE',
    });

    // Member 3: Checked in 3 hours ago, checked out 1 hour ago
    const in3h = new Date(now.getTime() - 3 * 3600 * 1000);
    const out1h = new Date(now.getTime() - 1 * 3600 * 1000);
    await Attendance.create({
      member: createdMembers[2]._id, // Liam Thorne
      branch: uptown._id,
      checkInTime: in3h,
      checkOutTime: out1h,
      method: 'QR_CODE',
    });

    // Member 4: Checked in morning (7am) and out (8:30am)
    const morningIn = new Date(now);
    morningIn.setHours(7, 15, 0, 0);
    const morningOut = new Date(now);
    morningOut.setHours(8, 40, 0, 0);
    await Attendance.create({
      member: createdMembers[3]._id, // Maya Chen
      branch: downtown._id,
      checkInTime: morningIn,
      checkOutTime: morningOut,
      method: 'QR_CODE',
    });

    // Member 8: Checked in 10 mins ago, still inside!
    const in10m = new Date(now.getTime() - 10 * 60 * 1000);
    await Attendance.create({
      member: createdMembers[7]._id, // Ryan Brooks
      branch: downtown._id,
      checkInTime: in10m,
      method: 'QR_CODE',
    });

    // Historical attendance across past days for chart analytics
    for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
      const pastDay = new Date(now);
      pastDay.setDate(pastDay.getDate() - dayOffset);
      pastDay.setHours(8 + (dayOffset % 4), 30, 0, 0);

      const pastOut = new Date(pastDay);
      pastOut.setHours(pastOut.getHours() + 1, 30, 0, 0);

      await Attendance.create({
        member: createdMembers[dayOffset % createdMembers.length]._id,
        branch: downtown._id,
        checkInTime: pastDay,
        checkOutTime: pastOut,
        method: 'QR_CODE',
      });
    }

    // 6. Audit Logs
    console.log('[Seed] Creating audit log records...');
    await AuditLog.insertMany([
      {
        user: adminUser._id,
        userName: adminUser.fullName,
        userRole: adminUser.role,
        action: 'SYSTEM_INITIALIZED',
        entity: 'System',
        details: { message: 'FitCore database initialized with default branches & packages' },
      },
      {
        user: receptionistUser._id,
        userName: receptionistUser.fullName,
        userRole: receptionistUser.role,
        action: 'MEMBER_CHECK_IN',
        entity: 'Attendance',
        details: { member: 'David Hayes (FC-1001)', method: 'QR_CODE' },
      },
      {
        user: receptionistUser._id,
        userName: receptionistUser.fullName,
        userRole: receptionistUser.role,
        action: 'MEMBER_CHECK_IN',
        entity: 'Attendance',
        details: { member: 'Sophia Laurent (FC-1002)', method: 'MANUAL' },
      },
    ]);

    console.log('✅ [Seed] FitCore Database successfully seeded!');
    console.log('---------------------------------------------------------');
    console.log('Credentials:');
    console.log('  👑 Super Admin: admin@fitcore.com / password123');
    console.log('  🏢 Gym Manager: manager@fitcore.com / password123');
    console.log('  🎫 Front Desk:  reception@fitcore.com / password123');
    console.log('  💪 Head Coach:  trainer@fitcore.com / password123');
    console.log('---------------------------------------------------------');
  } catch (err) {
    console.error('❌ [Seed] Error during seeding:', err);
    throw err;
  }
};

// If run directly
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
