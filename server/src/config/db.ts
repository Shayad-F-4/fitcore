import mongoose from 'mongoose';
import { ENV } from './env.js';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  try {
    const isSrv = ENV.MONGODB_URI.startsWith('mongodb+srv:');
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      maxPoolSize: 25,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 15000,
      ...(isSrv ? {} : { family: 4 }),
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error: any) {
    console.error('[Database] MongoDB connection error:', error?.message || error);
    if (error?.stack) console.error(error.stack);
    console.warn('[Database] Target URI:', ENV.MONGODB_URI.replace(/:([^:@]+)@/, ':****@'));
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[Database] MongoDB disconnected.');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.error('[Database] MongoDB error event:', err);
});
