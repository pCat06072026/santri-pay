/**
 * BetterAuth Schema for Cloudflare D1
 *
 * This schema extends our existing profiles table with BetterAuth's
 * required tables for authentication.
 */

import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

// ============================================================
// BETTERAUTH TABLES
// ============================================================

/**
 * Users table - extends our existing profiles
 * BetterAuth uses this for user management
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: text('email_verified'), // ISO timestamp when email was verified
  image: text('image'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

/**
 * Sessions table - stores active user sessions
 */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: text('expires_at').notNull(), // ISO timestamp when session expires
  token: text('token').notNull().unique(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

/**
 * Accounts table - links users to authentication providers
 * Supports multiple providers (credentials, OAuth, etc.)
 */
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(), // Provider's user ID
  providerId: text('provider_id').notNull(), // 'credential', 'google', etc.
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: text('access_token_expires_at'),
  refreshTokenExpiresAt: text('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'), // Hashed password for credential auth
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

/**
 * Verifications table - stores verification tokens
 * Used for email verification, password reset, etc.
 */
export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(), // email or user ID
  value: text('value').notNull(), // the verification token/code
  expiresAt: text('expires_at').notNull(), // ISO timestamp when expires
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// ============================================================
// INDEXES
// ============================================================

export const sessionsTokenIdx = index('idx_sessions_token').on(sessions.token);
export const sessionsUserIdIdx = index('idx_sessions_user_id').on(sessions.userId);
export const accountsUserIdIdx = index('idx_accounts_user_id').on(accounts.userId);
export const accountsProviderIdx = index('idx_accounts_provider').on(accounts.providerId, accounts.accountId);
export const verificationsIdentifierIdx = index('idx_verifications_identifier').on(verifications.identifier);
export const verificationsValueIdx = index('idx_verifications_value').on(verifications.value);

// ============================================================
// TYPE EXPORTS
// ============================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
