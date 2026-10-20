import mongoose from 'mongoose';
import { ENV } from './env.js';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      maxPoolSize: 25,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    console.warn('[Database] Note: Ensure MongoDB service is reachable at ' + ENV.MONGODB_URI);
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
