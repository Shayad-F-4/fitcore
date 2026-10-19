import mongoose from 'mongoose';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { Member } from '../models/Member.js';
import { GymSettings } from '../models/GymSettings.js';
import { ENV } from '../config/env.js';

async function main() {
  await mongoose.connect(ENV.MONGODB_URI);
  console.log('--- BRANCHES ---');
  const branches = await Branch.find().lean();
  console.log(JSON.stringify(branches, null, 2));

  console.log('--- USERS ---');
  const users = await User.find({}, 'email username fullName role branch').lean();
  console.log(JSON.stringify(users, null, 2));

  console.log('--- MEMBERS COUNT ---');
  console.log('Total members:', await Member.countDocuments());

  console.log('--- SETTINGS ---');
  console.log(JSON.stringify(await GymSettings.findOne().lean(), null, 2));

  process.exit(0);
}

main().catch(console.error);
