import dotenv from 'dotenv';
dotenv.config({ override: true });

const rawUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fitcore';
// If rawUri points to another DB from global system env, ensure fitcore is used
const dbUri = rawUri.includes('college_project')
  ? rawUri.replace('college_project', 'fitcore')
  : rawUri.endsWith('/')
  ? `${rawUri}fitcore`
  : rawUri;

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: dbUri,
  JWT_SECRET: process.env.JWT_SECRET || 'fitcore_super_secret_jwt_key_2026_elite_gym_ecosystem',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

// Strict validation in production mode
if (ENV.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('[FATAL SECURITY ERROR] In production, JWT_SECRET must be set to a cryptographically secure string of at least 32 characters.');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('[FATAL SECURITY ERROR] In production, MONGODB_URI must be provided explicitly.');
    process.exit(1);
  }
}
