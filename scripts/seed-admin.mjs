/**
 * Seed Script: Create Default Admin User
 *
 * Run this to create the default admin user for development.
 *
 * Usage:
 * node scripts/seed-admin.mjs
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../src/lib/db/schema';
import * as authSchema from '../src/lib/db/auth-schema';

// Simple hash function for seeding (use bcrypt in production)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function seed() {
  const DB_PATH = '.wrangler/state/v3/d1/719d78ea-4055-404f-8285-da32af46e164/sqlite.db';

  console.log('Seeding database...');

  // This is a placeholder - in Cloudflare Workers, you'd use D1 directly
  // For local development, you can use wrangler d1 execute instead

  const adminUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@pesantren.internal',
    name: 'Administrator',
    emailVerified: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const adminProfile = {
    id: adminUser.id,
    username: 'admin',
    fullName: 'Administrator',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log('Default admin user:');
  console.log('  ID:', adminUser.id);
  console.log('  Username: admin');
  console.log('  Password: admin123');
  console.log('');
  console.log('To seed manually, run:');
  console.log('  wrangler d1 execute santi-pay-dev --local --file=scripts/seed-admin.sql');
}

seed().catch(console.error);
