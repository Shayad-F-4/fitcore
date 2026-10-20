import dotenv from 'dotenv';
dotenv.config({ override: true });

const rawUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fitcore';
// If rawUri points to another DB from global system env, ensure fitcore is used
const dbUri = rawUri.includes('college_project')
  ? rawUri.replace('college_project', 'fitcore')
  : rawUri.endsWith('/')
  ? `${rawUri}fitcore`
  : rawUri;

const defaultSecret = 'sagar_fitness_super_secure_jwt_secret_pathardi_maharashtra_2026_production';

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: dbUri,
  JWT_SECRET: process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16 ? process.env.JWT_SECRET : defaultSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

// Diagnostic warning for production mode
if (ENV.NODE_ENV === 'production') {
  if (!process.env.MONGODB_URI) {
    console.warn('[Config Warning] MONGODB_URI is not set in environment variables! Using default: ' + dbUri);
  }
  if (!process.env.JWT_SECRET) {
    console.warn('[Config Info] JWT_SECRET not explicitly passed; using hardened default key.');
  }
}
