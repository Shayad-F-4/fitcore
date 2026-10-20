import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Branch } from '../models/Branch.js';
import { ENV } from '../config/env.js';

export async function ensureCoreUsers() {
  const branch = await Branch.findOne();
  const branchId = branch?._id;

  const usersToEnsure = [
    {
      email: 'shayadfakir2006@gmail.com',
      username: 'shayad',
      password: 'password123',
      fullName: 'Shayad Fakir (Gym Owner & Admin)',
      role: 'SUPER_ADMIN' as const,
      phone: '+91 98220 10001',
      branch: branchId,
      status: 'ACTIVE' as const,
      avatarUrl: '',
    },
    {
      email: 'shayadfakir7@gmail.com',
      username: 'shayad7',
      password: 'password123',
      fullName: 'Shayad Fakir (Gym Admin)',
      role: 'SUPER_ADMIN' as const,
      phone: '+91 98220 10001',
      branch: branchId,
      status: 'ACTIVE' as const,
      avatarUrl: '',
    },
    {
      email: 'admin@sagarfitness.com',
      username: 'admin',
      password: 'password123',
      fullName: 'Rajesh Deshmukh (Gym Admin / Owner)',
      role: 'SUPER_ADMIN' as const,
      phone: '+91 98220 10001',
      branch: branchId,
      status: 'ACTIVE' as const,
      avatarUrl: '',
    },
    {
      email: 'desk@sagarfitness.com',
      username: 'desk',
      password: 'password123',
      fullName: 'Pooja Kulkarni (Front Desk)',
      role: 'RECEPTIONIST' as const,
      phone: '+91 98220 10003',
      branch: branchId,
      status: 'ACTIVE' as const,
      avatarUrl: '',
    },
    {
      email: 'reception@sagarfitness.com',
      username: 'reception',
      password: 'password123',
      fullName: 'Pooja Kulkarni (Front Desk)',
      role: 'RECEPTIONIST' as const,
      phone: '+91 98220 10003',
      branch: branchId,
      status: 'ACTIVE' as const,
      avatarUrl: '',
    },
    {
      email: 'manager@sagarfitness.com',
      username: 'manager',
      password: 'password123',
      fullName: 'Amit Shinde (Gym Manager)',
      role: 'GYM_ADMIN' as const,
      phone: '+91 98220 10002',
      branch: branchId,
      status: 'ACTIVE' as const,
      avatarUrl: '',
    },
  ];

  for (const u of usersToEnsure) {
    let existing = await User.findOne({ email: u.email });
    if (!existing) {
      await User.create(u);
      console.log(`[Auth Setup] Created user account: ${u.email} / username: ${u.username} (${u.role})`);
    } else {
      // Preserve changed passwords unless explicitly requested via RESET_DEFAULT_PASSWORDS=true
      if (process.env.RESET_DEFAULT_PASSWORDS === 'true') {
        existing.password = u.password;
      }
      existing.username = u.username;
      existing.role = u.role;
      existing.status = 'ACTIVE';
      if (!existing.branch && branchId) existing.branch = branchId;
      // Clean up legacy unsplash placeholders
      if (existing.avatarUrl && existing.avatarUrl.includes('unsplash.com')) {
        existing.avatarUrl = '';
      }
      await existing.save();
      console.log(`[Auth Setup] Verified active account: ${u.email} / username: ${u.username} (${u.role})`);
    }
  }

  // Support custom gym owner provisioned via production environment variables
  const customAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const customAdminPassword = process.env.INITIAL_ADMIN_PASSWORD?.trim();
  if (customAdminEmail && customAdminPassword) {
    let customAdmin = await User.findOne({ email: customAdminEmail });
    if (!customAdmin) {
      await User.create({
        email: customAdminEmail,
        username: process.env.INITIAL_ADMIN_USERNAME?.trim().toLowerCase() || customAdminEmail.split('@')[0],
        password: customAdminPassword,
        fullName: process.env.INITIAL_ADMIN_NAME?.trim() || 'Sagar Fitness Gym Owner',
        role: 'SUPER_ADMIN',
        branch: branchId,
        status: 'ACTIVE',
      });
      console.log(`[Auth Setup] Created custom production Gym Owner: ${customAdminEmail}`);
    }
  }
}

// If run directly
if (process.argv[1]?.endsWith('ensureUsers.ts') || process.argv[1]?.endsWith('ensureUsers.js')) {
  mongoose.connect(ENV.MONGODB_URI)
    .then(async () => {
      console.log('Connected to DB for ensureUsers...');
      await ensureCoreUsers();
      console.log('Core users verified successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to ensure core users:', err);
      process.exit(1);
    });
}
