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
import { Notification } from '../models/Notification.js';
import { NotificationLog } from '../models/NotificationLog.js';

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await mongoose.connect(ENV.MONGODB_URI);
    console.log('[Seed] Connected.');

    // Clear existing collections cleanly
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
      Notification.deleteMany({}),
      NotificationLog.deleteMany({}),
    ]);

    // 1. Create Branches (Authentic Pune, Maharashtra Locations)
    console.log('[Seed] Creating branches in Pune...');
    const flagshipBranch = await Branch.create({
      name: 'FitCore Flagship - FC Road, Pune',
      code: 'FC-FCRD',
      address: 'Opp. Fergusson College Main Gate, FC Road, Shivajinagar',
      city: 'Pune',
      phone: '+91 20 2553 4400',
      email: 'fcroad@fitcore.in',
      openingHours: 'Mon-Sun: 05:30 AM - 10:30 PM',
      capacity: 200,
      status: 'ACTIVE',
    });

    const kothrudBranch = await Branch.create({
      name: 'FitCore Performance Lab - Kothrud, Pune',
      code: 'FC-KTH',
      address: 'Near Vanaz Corner, Paud Road, Kothrud',
      city: 'Pune',
      phone: '+91 20 2544 8820',
      email: 'kothrud@fitcore.in',
      openingHours: 'Mon-Sat: 06:00 AM - 10:00 PM',
      capacity: 150,
      status: 'ACTIVE',
    });

    const banerBranch = await Branch.create({
      name: 'FitCore Athlete Club - Baner, Pune',
      code: 'FC-BNR',
      address: 'Baner High Street, Near Balewadi Phata, Baner',
      city: 'Pune',
      phone: '+91 20 2729 1199',
      email: 'baner@fitcore.in',
      openingHours: '24 Hours / 7 Days',
      capacity: 180,
      status: 'ACTIVE',
    });

    // 2. Create Staff & Admin Users
    console.log('[Seed] Creating staff & admin users...');
    const adminUser = await User.create({
      email: 'admin@fitcore.com',
      password: 'password123',
      fullName: 'Rajesh Deshmukh',
      role: 'SUPER_ADMIN',
      phone: '+91 98220 10001',
      status: 'ACTIVE',
      avatarUrl: '',
    });

    await User.create({
      email: 'admin@sagarfitness.com',
      password: 'password123',
      fullName: 'Rajesh Deshmukh (Gym Admin / Owner)',
      role: 'SUPER_ADMIN',
      phone: '+91 98220 10001',
      branch: flagshipBranch._id,
      status: 'ACTIVE',
      avatarUrl: '',
    });

    const managerUser = await User.create({
      email: 'manager@fitcore.com',
      password: 'password123',
      fullName: 'Amit Shinde',
      role: 'GYM_ADMIN',
      phone: '+91 98220 10002',
      branch: flagshipBranch._id,
      status: 'ACTIVE',
      avatarUrl: '',
    });

    const receptionistUser = await User.create({
      email: 'reception@fitcore.com',
      password: 'password123',
      fullName: 'Pooja Kulkarni',
      role: 'RECEPTIONIST',
      phone: '+91 98220 10003',
      branch: flagshipBranch._id,
      status: 'ACTIVE',
      avatarUrl: '',
    });

    await User.create({
      email: 'desk@sagarfitness.com',
      password: 'password123',
      fullName: 'Pooja Kulkarni (Front Desk)',
      role: 'RECEPTIONIST',
      phone: '+91 98220 10003',
      branch: flagshipBranch._id,
      status: 'ACTIVE',
      avatarUrl: '',
    });

    const trainerUser = await User.create({
      email: 'trainer@fitcore.com',
      password: 'password123',
      fullName: 'Sachin Gaikwad',
      role: 'TRAINER',
      phone: '+91 98220 10004',
      branch: flagshipBranch._id,
      status: 'ACTIVE',
      avatarUrl: '',
    });

    // 3. Create Standard Indian Membership Plans (₹ standard Indian gym pricing)
    console.log('[Seed] Creating standard Indian membership plans...');
    const plans = await MembershipPlan.insertMany([
      {
        name: 'Annual Elite All-Access',
        type: 'ANNUAL',
        durationDays: 365,
        price: 14000,
        description: '365 days unrestricted VIP access across all Pune branches with complimentary personal training, recovery lounge, and steam bath.',
        features: [
          'All Pune Branches VIP Access',
          'Unlimited Steam Bath & Sauna Access',
          '2 Personal Training (PT) Sessions',
          'Complimentary Locker & Towel Service',
          'Quarterly InBody 570 Biometric Scans',
          'Priority Slot Booking via App',
        ],
        active: true,
        isPopular: false,
        badge: 'VIP ALL-ACCESS',
      },
      {
        name: 'Quarterly Strength & Cardio',
        type: 'QUARTERLY',
        durationDays: 90,
        price: 4500,
        description: 'Engineered for dedicated athletes seeking Olympic lifting platforms, heavy dumbbells, and high-intensity functional turf.',
        features: [
          'FC Road & Kothrud Branch Access',
          'Olympic Lifting Platforms & Free Weights',
          'Functional Turf & Cross-Training Rig',
          'FitCore Workout & PR Tracker',
          'Monthly InBody Body Composition Scan',
        ],
        active: true,
        isPopular: true,
        badge: 'MOST POPULAR',
      },
      {
        name: 'Half-Yearly Transform Pro',
        type: 'HALF_YEARLY',
        durationDays: 180,
        price: 7500,
        description: 'Comprehensive 6-month body transformation package including bi-monthly body composition scans and steam bath access.',
        features: [
          'All Pune Branches Access',
          'Bi-Monthly InBody Biometric Scans',
          'Steam Bath & Recovery Lounge',
          '2 Guest Passes per Month',
          'Customized Diet & Macro Blueprint',
        ],
        active: true,
        isPopular: false,
        badge: 'BEST VALUE',
      },
      {
        name: 'Monthly General Fitness',
        type: 'MONTHLY',
        durationDays: 30,
        price: 1500,
        description: 'Our core monthly fitness membership providing unlimited cardio deck access, selectorized machines, and locker facilities.',
        features: [
          'Single Branch Access',
          'Matrix Cardio & Selectorized Strength Machines',
          'Shower & Changing Facilities',
          'High-Speed Wi-Fi',
        ],
        active: true,
        isPopular: false,
        badge: 'FLEXIBLE',
      },
      {
        name: 'Personal Training & Cross-Training Pass',
        type: 'PT_PACKAGE',
        durationDays: 30,
        price: 2500,
        description: 'Dedicated functional CrossFit box training, certified coach guidance, endurance circuits, and daily high-intensity WODs.',
        features: [
          'Daily Coached WOD Classes',
          'Certified CrossFit & Kettlebell Coaches',
          'Heart-Rate Zone Monitoring',
          'Competition Prep & Olympic Lift Clinics',
        ],
        active: true,
        isPopular: false,
        badge: 'COACHED',
      },
      {
        name: '10-Day Athlete Flex Pass',
        type: 'DAY_PASS',
        durationDays: 60,
        price: 999,
        description: '10 flexible drop-in gym sessions valid across any 60-day window. Perfect for travelers and hybrid trainers.',
        features: [
          '10 Full-Day Gym Passes',
          'Valid for 60 Days',
          'Access to Any Branch',
          'Includes Locker & Showers',
        ],
        active: true,
        isPopular: false,
        badge: 'DROP-IN',
      },
    ]);

    const annualPlan = plans[0];      // ₹14,000 / 365d
    const quarterlyPlan = plans[1];   // ₹4,500 / 90d
    const halfYearlyPlan = plans[2];  // ₹7,500 / 180d
    const monthlyPlan = plans[3];     // ₹1,500 / 30d
    const ptPlan = plans[4];          // ₹2,500 / 30d

    // 4. Create 12 Indian Maharashtrian Members with All Real-World Conditions
    console.log('[Seed] Creating 12 Maharashtrian members with diverse statuses & dues...');

    const membersData = [
      {
        memberId: 'FC-1001',
        fullName: 'Rohan Deshmukh',
        email: 'rohan.deshmukh@example.in',
        phone: '+91 98220 44551',
        gender: 'MALE',
        dob: new Date('1996-04-12'),
        address: 'Flat 402, Shivneri Heights, FC Road, Shivajinagar, Pune 411005',
        branch: flagshipBranch._id,
        fitnessGoals: ['Hypertrophy', 'Strength Training', 'Deadlift 200kg'],
        photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1001_RD96',
        status: 'ACTIVE',
        plan: annualPlan,
        expiryDaysFromNow: 240, // ACTIVE (Long term)
        amountDue: 14000,
        amountPaid: 14000,      // FULLY PAID
        paymentMethod: 'UPI',
      },
      {
        memberId: 'FC-1002',
        fullName: 'Tanvi Kulkarni',
        email: 'tanvi.kulkarni@example.in',
        phone: '+91 98812 33445',
        gender: 'FEMALE',
        dob: new Date('1998-07-25'),
        address: 'B-12, Mayur Colony, Kothrud, Pune 411038',
        branch: flagshipBranch._id,
        fitnessGoals: ['Functional Mobility', 'Fat Loss', 'Core Conditioning'],
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1002_TK98',
        status: 'ACTIVE',
        plan: quarterlyPlan,
        expiryDaysFromNow: 2,   // EXPIRING IN EXACTLY 2 DAYS (Auto WhatsApp candidate!)
        amountDue: 4500,
        amountPaid: 4500,       // FULLY PAID
        paymentMethod: 'UPI',
      },
      {
        memberId: 'FC-1003',
        fullName: 'Swapnil Shinde',
        email: 'swapnil.shinde@example.in',
        phone: '+91 97645 88990',
        gender: 'MALE',
        dob: new Date('1993-11-18'),
        address: 'Flat 101, Balaji Residency, Baner Road, Pune 411045',
        branch: kothrudBranch._id,
        fitnessGoals: ['Olympic Weightlifting', 'Powerlifting', 'Shoulder Hypertrophy'],
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1003_SS93',
        status: 'ACTIVE',
        plan: quarterlyPlan,
        expiryDaysFromNow: 45,  // ACTIVE
        amountDue: 4500,
        amountPaid: 3000,       // PARTIAL PAYMENT! Dues = ₹1,500
        paymentMethod: 'UPI',
      },
      {
        memberId: 'FC-1004',
        fullName: 'Sneha Joshi',
        email: 'sneha.joshi@example.in',
        phone: '+91 98500 12345',
        gender: 'FEMALE',
        dob: new Date('1999-03-14'),
        address: 'Row House 7, Nyati Estate, Mohammadwadi, Pune 411060',
        branch: flagshipBranch._id,
        fitnessGoals: ['Marathon Prep', 'Cardio Endurance', 'Pilates'],
        photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1004_SJ99',
        status: 'ACTIVE',
        plan: monthlyPlan,
        expiryDaysFromNow: 4,   // EXPIRING SOON IN 4 DAYS (Manual reminder candidate!)
        amountDue: 1500,
        amountPaid: 1500,       // FULLY PAID
        paymentMethod: 'CASH',
      },
      {
        memberId: 'FC-1005',
        fullName: 'Aditya Patil',
        email: 'aditya.patil@example.in',
        phone: '+91 99224 55667',
        gender: 'MALE',
        dob: new Date('1995-09-08'),
        address: '301 Greenfield Apts, Aundh, Pune 411007',
        branch: banerBranch._id,
        fitnessGoals: ['Calisthenics', 'Agility', 'Weighted Pullups'],
        photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1005_AP95',
        status: 'ACTIVE',
        plan: halfYearlyPlan,
        expiryDaysFromNow: 95,  // ACTIVE
        amountDue: 7500,
        amountPaid: 7500,       // FULLY PAID
        paymentMethod: 'DEBIT_CARD',
      },
      {
        memberId: 'FC-1006',
        fullName: 'Pooja Gaikwad',
        email: 'pooja.gaikwad@example.in',
        phone: '+91 97631 22334',
        gender: 'FEMALE',
        dob: new Date('1997-01-20'),
        address: 'Flat 14, Swapnagandhi Society, Karve Nagar, Pune 411052',
        branch: flagshipBranch._id,
        fitnessGoals: ['Cardiovascular Health', 'Zumba', 'Weight Loss'],
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1006_PG97',
        status: 'ACTIVE',
        plan: ptPlan,
        expiryDaysFromNow: 20,  // ACTIVE
        amountDue: 2500,
        amountPaid: 2500,       // FULLY PAID
        paymentMethod: 'UPI',
      },
      {
        memberId: 'FC-1007',
        fullName: 'Omkar Pawar',
        email: 'omkar.pawar@example.in',
        phone: '+91 98901 77889',
        gender: 'MALE',
        dob: new Date('1994-06-30'),
        address: 'Plot 28, Sahakar Nagar 2, Pune 411009',
        branch: kothrudBranch._id,
        fitnessGoals: ['Pilates', 'Flexibility', 'Posture Correction'],
        photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1007_OP94',
        status: 'EXPIRED',      // EXPIRED 5 DAYS AGO
        plan: monthlyPlan,
        expiryDaysFromNow: -5,
        amountDue: 1500,
        amountPaid: 1500,
        paymentMethod: 'CASH',
      },
      {
        memberId: 'FC-1008',
        fullName: 'Rutuja Bhosale',
        email: 'rutuja.bhosale@example.in',
        phone: '+91 98233 44556',
        gender: 'FEMALE',
        dob: new Date('1992-12-10'),
        address: '102 Silver Oak, Prabhat Road, Lane 4, Erandwane, Pune 411004',
        branch: flagshipBranch._id,
        fitnessGoals: ['Rehabilitation', 'Lower Back Strength', 'Posture'],
        photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1008_RB92',
        status: 'FROZEN',       // FROZEN / PAUSED
        plan: quarterlyPlan,
        expiryDaysFromNow: 30,
        amountDue: 4500,
        amountPaid: 4500,
        paymentMethod: 'BANK_TRANSFER',
        freezeHistory: [
          {
            fromDate: new Date(Date.now() - 7 * 24 * 3600 * 1000),
            toDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
            reason: 'Ligament strain recovery & physiotherapy',
          },
        ],
      },
      {
        memberId: 'FC-1009',
        fullName: 'Sanket Jadhav',
        email: 'sanket.jadhav@example.in',
        phone: '+91 99750 99112',
        gender: 'MALE',
        dob: new Date('2000-02-17'),
        address: 'Flat 503, Galaxy Towers, Viman Nagar, Pune 411014',
        branch: flagshipBranch._id,
        fitnessGoals: ['Arm Size', 'Bench Press', 'Athleticism'],
        photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1009_SJ00',
        status: 'ACTIVE',
        plan: annualPlan,
        expiryDaysFromNow: 300, // ACTIVE
        amountDue: 14000,
        amountPaid: 9000,       // PARTIAL PAYMENT! Dues = ₹5,000
        paymentMethod: 'UPI',
      },
      {
        memberId: 'FC-1010',
        fullName: 'Aniket More',
        email: 'aniket.more@example.in',
        phone: '+91 98229 11223',
        gender: 'MALE',
        dob: new Date('1989-08-22'),
        address: 'C-5, Parihar Chowk, Aundh, Pune 411007',
        branch: kothrudBranch._id,
        fitnessGoals: ['Cardiovascular Endurance', 'Stress Relief', 'Treadmill Intervals'],
        photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1010_AM89',
        status: 'EXPIRED',      // EXPIRED 12 DAYS AGO
        plan: quarterlyPlan,
        expiryDaysFromNow: -12,
        amountDue: 4500,
        amountPaid: 4500,
        paymentMethod: 'UPI',
      },
      {
        memberId: 'FC-1011',
        fullName: 'Nikhil Sawant',
        email: 'nikhil.sawant@example.in',
        phone: '+91 97664 33221',
        gender: 'MALE',
        dob: new Date('1998-10-05'),
        address: 'Flat 204, Ganga Skies, Wakad, Pune 411057',
        branch: banerBranch._id,
        fitnessGoals: ['Agility', 'Functional Fitness', 'Kettlebell Swings'],
        photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1011_NS98',
        status: 'ACTIVE',
        plan: monthlyPlan,
        expiryDaysFromNow: 12,  // ACTIVE
        amountDue: 1500,
        amountPaid: 1500,
        paymentMethod: 'CASH',
      },
      {
        memberId: 'FC-1012',
        fullName: 'Prathamesh Kadam',
        email: 'prathamesh.kadam@example.in',
        phone: '+91 98817 66554',
        gender: 'MALE',
        dob: new Date('2002-05-19'),
        address: 'Near Cummins College, Karvenagar, Pune 411052',
        branch: flagshipBranch._id,
        fitnessGoals: ['College Rugby Athlete', 'Speed & Power', 'Squats'],
        photoUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
        qrCodeToken: 'FIT_QR_FC1012_PK02',
        status: 'ACTIVE',
        plan: halfYearlyPlan,
        expiryDaysFromNow: 140, // ACTIVE
        amountDue: 7500,
        amountPaid: 7500,
        paymentMethod: 'UPI',
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

      // Create Membership with calculated start & expiry dates
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
        amountDue: m.amountDue,
        amountPaid: m.amountPaid,
        status: m.status === 'FROZEN' ? 'FROZEN' : m.expiryDaysFromNow < 0 ? 'EXPIRED' : 'ACTIVE',
        freezeHistory: m.freezeHistory || [],
      });

      // Create Payment Record (Fully paid or partial with dues balance)
      receiptCounter++;
      const isPartial = m.amountPaid < m.amountDue;
      const balanceRemaining = Math.max(0, m.amountDue - m.amountPaid);

      await Payment.create({
        receiptNumber: `RCP-2026-${receiptCounter}`,
        member: member._id,
        membership: membership._id,
        amount: m.amountPaid,
        paymentMethod: m.paymentMethod as any,
        transactionRef: m.paymentMethod === 'UPI' ? `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}` : undefined,
        status: isPartial ? 'PARTIAL' : 'PAID',
        type: 'MEMBERSHIP',
        balanceRemaining,
        notes: isPartial
          ? `Partial payment for ${m.plan.name} (Pending Due: ₹${balanceRemaining})`
          : `Full payment for ${m.plan.name}`,
        recordedBy: receptionistUser._id,
        paymentDate: startDate,
      });
    }

    // 5. Create Realistic Attendance & Live Occupancy for Today
    console.log('[Seed] Creating realistic attendance and live occupancy...');
    const now = new Date();

    // Member 1 (Rohan Deshmukh): Checked in 45 mins ago, inside gym!
    const in45m = new Date(now.getTime() - 45 * 60 * 1000);
    await Attendance.create({
      member: createdMembers[0]._id,
      branch: flagshipBranch._id,
      checkInTime: in45m,
      method: 'QR_CODE',
      checkedInBy: receptionistUser._id,
    });

    // Member 2 (Tanvi Kulkarni): Checked in 25 mins ago, inside gym!
    const in25m = new Date(now.getTime() - 25 * 60 * 1000);
    await Attendance.create({
      member: createdMembers[1]._id,
      branch: flagshipBranch._id,
      checkInTime: in25m,
      method: 'MANUAL',
      checkedInBy: receptionistUser._id,
    });

    // Member 5 (Aditya Patil): Checked in 15 mins ago, inside gym!
    const in15m = new Date(now.getTime() - 15 * 60 * 1000);
    await Attendance.create({
      member: createdMembers[4]._id,
      branch: banerBranch._id,
      checkInTime: in15m,
      method: 'QR_CODE',
    });

    // Member 6 (Pooja Gaikwad): Checked in 90 mins ago, inside gym!
    const in90m = new Date(now.getTime() - 90 * 60 * 1000);
    await Attendance.create({
      member: createdMembers[5]._id,
      branch: flagshipBranch._id,
      checkInTime: in90m,
      method: 'QR_CODE',
    });

    // Member 9 (Sanket Jadhav): Checked in 10 mins ago, inside gym!
    const in10m = new Date(now.getTime() - 10 * 60 * 1000);
    await Attendance.create({
      member: createdMembers[8]._id,
      branch: flagshipBranch._id,
      checkInTime: in10m,
      method: 'QR_CODE',
    });

    // Member 11 (Nikhil Sawant): Checked in 75 mins ago, inside gym!
    const in75m = new Date(now.getTime() - 75 * 60 * 1000);
    await Attendance.create({
      member: createdMembers[10]._id,
      branch: banerBranch._id,
      checkInTime: in75m,
      method: 'MANUAL',
      checkedInBy: receptionistUser._id,
    });

    // Member 3 (Swapnil Shinde): Checked in 3 hours ago, checked out 1 hour ago
    const in3h = new Date(now.getTime() - 3 * 3600 * 1000);
    const out1h = new Date(now.getTime() - 1 * 3600 * 1000);
    await Attendance.create({
      member: createdMembers[2]._id,
      branch: kothrudBranch._id,
      checkInTime: in3h,
      checkOutTime: out1h,
      method: 'QR_CODE',
    });

    // Member 4 (Sneha Joshi): Checked in morning (7:15 AM) and out (8:40 AM)
    const morningIn = new Date(now);
    morningIn.setHours(7, 15, 0, 0);
    const morningOut = new Date(now);
    morningOut.setHours(8, 40, 0, 0);
    await Attendance.create({
      member: createdMembers[3]._id,
      branch: flagshipBranch._id,
      checkInTime: morningIn,
      checkOutTime: morningOut,
      method: 'QR_CODE',
    });

    // Member 12 (Prathamesh Kadam): Checked in 10:00 AM, out 11:30 AM
    const midIn = new Date(now);
    midIn.setHours(10, 0, 0, 0);
    const midOut = new Date(now);
    midOut.setHours(11, 30, 0, 0);
    await Attendance.create({
      member: createdMembers[11]._id,
      branch: flagshipBranch._id,
      checkInTime: midIn,
      checkOutTime: midOut,
      method: 'QR_CODE',
    });

    // Historical attendance across past 5 days for analytics charts
    for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
      const pastDay = new Date(now);
      pastDay.setDate(pastDay.getDate() - dayOffset);
      pastDay.setHours(8 + (dayOffset % 4), 30, 0, 0);

      const pastOut = new Date(pastDay);
      pastOut.setHours(pastOut.getHours() + 1, 30, 0, 0);

      await Attendance.create({
        member: createdMembers[dayOffset % createdMembers.length]._id,
        branch: flagshipBranch._id,
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
        details: { message: 'FitCore database initialized with Pune branches & Indian standard packages' },
      },
      {
        user: receptionistUser._id,
        userName: receptionistUser.fullName,
        userRole: receptionistUser.role,
        action: 'MEMBER_CHECK_IN',
        entity: 'Attendance',
        details: { member: 'Rohan Deshmukh (FC-1001)', method: 'QR_CODE' },
      },
      {
        user: receptionistUser._id,
        userName: receptionistUser.fullName,
        userRole: receptionistUser.role,
        action: 'MEMBER_CHECK_IN',
        entity: 'Attendance',
        details: { member: 'Tanvi Kulkarni (FC-1002)', method: 'MANUAL' },
      },
      {
        user: receptionistUser._id,
        userName: receptionistUser.fullName,
        userRole: receptionistUser.role,
        action: 'PAYMENT_COLLECTED',
        entity: 'Payment',
        details: { member: 'Swapnil Shinde (FC-1003)', amount: 3000, dueRemaining: 1500 },
      },
    ]);

    console.log('✅ [Seed] FitCore Database successfully seeded with Maharashtrian members & standard Indian pricing!');
    console.log('---------------------------------------------------------');
    console.log('Credentials:');
    console.log('  👑 Super Admin / Owner: admin@fitcore.com / password123 (Rajesh Deshmukh)');
    console.log('  🏢 Gym Manager:         manager@fitcore.com / password123 (Amit Shinde)');
    console.log('  🎫 Front Desk Staff:    reception@fitcore.com / password123 (Pooja Kulkarni)');
    console.log('  💪 Senior Coach:        trainer@fitcore.com / password123 (Sachin Gaikwad)');
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
