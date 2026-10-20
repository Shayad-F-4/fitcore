import { MembershipPlan } from '../models/MembershipPlan.js';

export async function ensureDefaultPlans() {
  try {
    const existingCount = await MembershipPlan.countDocuments();
    if (existingCount > 0) {
      return;
    }

    console.log('[Plans Setup] No membership plans found in database. Seeding standard Sagar Fitness Gym plans...');

    const defaultPlans = [
      {
        name: 'Monthly General Fitness',
        type: 'MONTHLY' as const,
        durationDays: 30,
        price: 1500,
        description: 'Full gym floor and cardio equipment access with locker facility.',
        features: [
          'Full Gym Floor Access',
          'Cardio & Strength Machines',
          'Changing Room & Locker Access',
          'General Trainer Guidance',
        ],
        active: true,
        isPopular: false,
        badge: 'FLEXIBLE',
      },
      {
        name: 'Quarterly Strength & Transformation',
        type: 'QUARTERLY' as const,
        durationDays: 90,
        price: 4000,
        description: 'Our most popular 3-month comprehensive fitness and strength training program.',
        features: [
          'Full Access for 3 Months',
          'Free Weight & Olympic Lifting Rig',
          'Custom Workout Routine Blueprint',
          'Progress & Measurement Tracking',
        ],
        active: true,
        isPopular: true,
        badge: 'MOST POPULAR',
      },
      {
        name: 'Half-Yearly Transform Pro',
        type: 'HALF_YEARLY' as const,
        durationDays: 180,
        price: 7000,
        description: 'Complete 6-month body transformation package for dedicated athletes.',
        features: [
          'Full 6 Months Access',
          'Diet & Nutrition Guidance',
          'Bi-Monthly Progress Checkups',
          'Locker & Shower Facility',
        ],
        active: true,
        isPopular: false,
        badge: 'BEST VALUE',
      },
      {
        name: 'Annual Elite All-Access',
        type: 'ANNUAL' as const,
        durationDays: 365,
        price: 12000,
        description: 'Complete 1-year unlimited access with complimentary workout consultation.',
        features: [
          'Full 365 Days Unrestricted Access',
          'Complete Nutrition & Diet Chart',
          'Quarterly Fitness Assessment',
          'Priority Trainer Support',
        ],
        active: true,
        isPopular: false,
        badge: 'VIP ALL-ACCESS',
      },
      {
        name: 'Personal Training (1 Month)',
        type: 'PT_PACKAGE' as const,
        durationDays: 30,
        price: 3500,
        description: 'One-on-one personal coach attention, customized daily workouts, and dietary monitoring.',
        features: [
          'Dedicated Personal Trainer',
          'Custom Daily Workout Routine',
          'Daily Form Correction',
          'Nutrition & Macro Guidance',
        ],
        active: true,
        isPopular: false,
        badge: 'COACHED',
      },
    ];

    await MembershipPlan.insertMany(defaultPlans);
    console.log('[Plans Setup] Successfully seeded standard Sagar Fitness Gym membership plans!');
  } catch (error) {
    console.error('[Plans Setup Error]', error);
  }
}
