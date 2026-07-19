/**
 * BetterAuth Configuration for Cloudflare Workers
 *
 * This file sets up BetterAuth with:
 * - Drizzle ORM adapter for D1 database
 * - Credential-based authentication (username/password)
 * - Session management with cookies
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from '../db/auth-schema';
import * as appSchema from '../db/schema';

// Extend schema with auth tables
const fullSchema = {
  ...schema,
  ...appSchema,
};

/**
 * Create BetterAuth instance configured for Cloudflare Workers + D1
 */
export function createAuth(d1Database: D1Database) {
  return betterAuth({
    // Database adapter
    database: drizzleAdapter(d1Database, {
      provider: 'sqlite',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),

    // Email configuration (optional - for password reset, etc.)
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Set to true in production
      password: {
        hash: async (password: string) => {
          // Use Web Crypto API for password hashing (available in Workers)
          const encoder = new TextEncoder();
          const data = encoder.encode(password);
          const hash = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hash));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        },
        verify: async (password: string, hash: string) => {
          const encoder = new TextEncoder();
          const data = encoder.encode(password);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          return computedHash === hash;
        },
      },
    },

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every day
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // Cache for 5 minutes
      },
    },

    // Advanced options
    advanced: {
      generateId: () => crypto.randomUUID(),
    },

    // Rate limiting (basic protection)
    rateLimit: {
      max: 100,
      window: 60 * 1000, // 1 minute
    },
  });
}

/**
 * Auth instance type for use in API routes
 */
export type AuthInstance = ReturnType<typeof createAuth>;

/**
 * Type for authenticated user
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
}

/**
 * Type for session
 */
export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: string;
  token: string;
}
