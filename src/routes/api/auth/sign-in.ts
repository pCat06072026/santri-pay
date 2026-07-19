/**
 * BetterAuth API Handler for TanStack Start
 *
 * This file creates the API routes for BetterAuth authentication.
 * It handles:
 * - POST /api/auth/sign-in - User login
 * - POST /api/auth/sign-out - User logout
 * - GET /api/auth/session - Get current session
 */

import type { APIEvent } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { users, accounts } from '~/lib/db/auth-schema';
import { profiles, userRoles } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createDB } from '~/lib/db/client';

/**
 * Get auth instance for current request
 */
function getAuth(event: APIEvent) {
  const db = createDB(event.context.cloudflare?.env?.DB);
  return createAuth(db);
}

/**
 * POST /api/auth/sign-in
 * Sign in with username and password
 */
export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { username, password } = body;

    if (!username || !password) {
      return Response.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get D1 database from context
    const db = createDB(event.context.cloudflare?.env?.DB);
    const auth = createAuth(db);

    // Find user by email (stored as username@pesantren.internal)
    const email = `${username.toLowerCase()}@pesantren.internal`;

    // Sign in using BetterAuth
    const session = await auth.api.signIn.emailPassword({
      body: {
        email,
        password,
      },
    });

    if (!session) {
      return Response.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Get user profile
    const userProfile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, session.user.id))
      .get();

    const roles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, session.user.id));

    return Response.json({
      session,
      profile: userProfile,
      role: roles[0]?.role || null,
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return Response.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
