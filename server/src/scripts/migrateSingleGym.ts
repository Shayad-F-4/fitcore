import mongoose from 'mongoose';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { Member } from '../models/Member.js';
import { Attendance } from '../models/Attendance.js';
import { Membership } from '../models/Membership.js';
import { GymSettings } from '../models/GymSettings.js';
import { ENV } from '../config/env.js';

export async function migrateToSingleGym() {
  console.log('[Migration] Starting migration to single Sagar Fitness Gym configuration...');

  // 1. Find or create the primary single gym branch
  let primaryBranch = await Branch.findOne({ code: 'SAGAR-01' });
  if (!primaryBranch) {
    // Check if an existing branch can be converted
    primaryBranch = await Branch.findOne();
    if (primaryBranch) {
      primaryBranch.name = 'Sagar Fitness Gym';
      primaryBranch.code = 'SAGAR-01';
      primaryBranch.address = 'Sagar Fitness Gym, Near Sagar Corner, Baner';
      primaryBranch.city = 'Pune';
      primaryBranch.phone = '+91 98220 10001';
      primaryBranch.email = 'info@sagarfitness.com';
      primaryBranch.openingHours = 'Mon-Sun: 05:30 AM - 10:30 PM';
      primaryBranch.capacity = 250;
      primaryBranch.status = 'ACTIVE';
      await primaryBranch.save();
    } else {
      primaryBranch = await Branch.create({
        name: 'Sagar Fitness Gym',
        code: 'SAGAR-01',
        address: 'Sagar Fitness Gym, Near Sagar Corner, Baner',
        city: 'Pune',
        phone: '+91 98220 10001',
        email: 'info@sagarfitness.com',
        openingHours: 'Mon-Sun: 05:30 AM - 10:30 PM',
        capacity: 250,
        status: 'ACTIVE',
      });
    }
  }

  const primaryBranchId = primaryBranch._id;
  console.log(`[Migration] Primary gym branch ID: ${primaryBranchId} (Sagar Fitness Gym)`);

  // 2. Safely reassign all members to this single primary branch
  const memberUpdate = await Member.updateMany(
    {},
    { $set: { branch: primaryBranchId } }
  );
  console.log(`[Migration] Updated ${memberUpdate.modifiedCount} members to single gym location.`);

  // 3. Safely reassign all users/staff to this single primary branch
  const userUpdate = await User.updateMany(
    {},
    { $set: { branch: primaryBranchId } }
  );
  console.log(`[Migration] Updated ${userUpdate.modifiedCount} users to single gym location.`);

  // 4. Safely reassign all attendance logs to this single primary branch
  const attendanceUpdate = await Attendance.updateMany(
    {},
    { $set: { branch: primaryBranchId } }
  );
  console.log(`[Migration] Updated ${attendanceUpdate.modifiedCount} attendance records to single gym location.`);

  // 5. Safely reassign all memberships to this single primary branch
  const membershipUpdate = await Membership.updateMany(
    {},
    { $set: { branch: primaryBranchId } }
  );
  console.log(`[Migration] Updated ${membershipUpdate.modifiedCount} memberships to single gym location.`);

  // 6. Delete any other redundant branch records
  const deleteResult = await Branch.deleteMany({ _id: { $ne: primaryBranchId } });
  console.log(`[Migration] Removed ${deleteResult.deletedCount} redundant branch records.`);

  // 7. Update GymSettings to single Sagar Fitness Gym settings (Tax-free, Pune, Asia/Kolkata)
  let settings = await GymSettings.findOne();
  if (!settings) {
    settings = new GymSettings({});
  }
  settings.gymName = 'Sagar Fitness Gym';
  settings.tagline = 'Strength • Transformation • Health Center';
  settings.address = 'Near Sagar Corner, Baner';
  settings.city = 'Pune';
  settings.state = 'Maharashtra';
  settings.pincode = '411045';
  settings.phone = '+91 98220 10001';
  settings.email = 'info@sagarfitness.com';
  settings.logoUrl = '/logo.png';
  settings.gstin = '';
  settings.isTaxEnabled = false;
  settings.taxRatePercent = 0;
  settings.currency = 'INR';
  settings.currencySymbol = '₹';
  settings.timezone = 'Asia/Kolkata';
  await settings.save();
  console.log('[Migration] Updated GymSettings to single Sagar Fitness Gym configuration (Tax-Free).');

  console.log('[Migration] Single-gym migration completed successfully!');
  return { primaryBranchId, settings };
}

// If run directly
if (process.argv[1]?.endsWith('migrateSingleGym.ts') || process.argv[1]?.endsWith('migrateSingleGym.js')) {
  mongoose.connect(ENV.MONGODB_URI)
    .then(async () => {
      await migrateToSingleGym();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration Error]', err);
      process.exit(1);
    });
}
