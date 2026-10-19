import mongoose from 'mongoose';
import { Member } from '../models/Member.js';
import { Membership } from '../models/Membership.js';
import { MembershipPlan } from '../models/MembershipPlan.js';
import { Branch } from '../models/Branch.js';
import crypto from 'crypto';

await mongoose.connect('mongodb://127.0.0.1:27017/fitcore');

const plan = await MembershipPlan.findOne({ active: true });
const branch = await Branch.findOne();
console.log('Using plan:', plan?.name, 'branch:', branch?.name);

const now = new Date();
const exp2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
const exp4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

// Member 1: Expiring in 2 days (Auto reminder target)
let member2D = await Member.findOne({ email: 'rohit.verma@example.in' });
if (!member2D) {
  member2D = await Member.create({
    memberId: 'FC-1098',
    fullName: 'Rohit Verma',
    email: 'rohit.verma@example.in',
    phone: '+91 98765 12340',
    gender: 'MALE',
    branch: branch?._id,
    qrCodeToken: crypto.randomBytes(16).toString('hex'),
    status: 'ACTIVE',
    joinDate: new Date(),
    emergencyContact: { name: 'Sunita Verma', phone: '+91 98765 00000', relationship: 'Spouse' }
  });
  console.log('Created member for 2D test:', member2D.fullName);
}

let sub2D = await Membership.findOne({ member: member2D._id, status: 'ACTIVE' });
if (sub2D) {
  sub2D.expiryDate = exp2Days;
  await sub2D.save();
} else {
  sub2D = await Membership.create({
    member: member2D._id,
    plan: plan?._id,
    startDate: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
    expiryDate: exp2Days,
    status: 'ACTIVE',
    originalPrice: plan?.price || 1499,
    amountDue: plan?.price || 1499,
    amountPaid: plan?.price || 1499,
    paymentStatus: 'PAID'
  });
}
await Member.findByIdAndUpdate(member2D._id, { currentMembership: sub2D._id });

// Member 2: Expiring in 4 days (Manual reminder target)
let member4D = await Member.findOne({ email: 'priya.sharma@example.in' });
if (!member4D) {
  member4D = await Member.create({
    memberId: 'FC-1099',
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.in',
    phone: '+91 98111 22233',
    gender: 'FEMALE',
    branch: branch?._id,
    qrCodeToken: crypto.randomBytes(16).toString('hex'),
    status: 'ACTIVE',
    joinDate: new Date(),
    emergencyContact: { name: 'Anil Sharma', phone: '+91 98111 00000', relationship: 'Brother' }
  });
  console.log('Created member for 4D test:', member4D.fullName);
}

let sub4D = await Membership.findOne({ member: member4D._id, status: 'ACTIVE' });
if (sub4D) {
  sub4D.expiryDate = exp4Days;
  await sub4D.save();
} else {
  sub4D = await Membership.create({
    member: member4D._id,
    plan: plan?._id,
    startDate: new Date(now.getTime() - 26 * 24 * 60 * 60 * 1000),
    expiryDate: exp4Days,
    status: 'ACTIVE',
    originalPrice: plan?.price || 1499,
    amountDue: plan?.price || 1499,
    amountPaid: plan?.price || 1499,
    paymentStatus: 'PAID'
  });
}
await Member.findByIdAndUpdate(member4D._id, { currentMembership: sub4D._id });

console.log('Seeded test expiry members successfully.');
await mongoose.disconnect();
