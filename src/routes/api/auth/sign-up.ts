/**
 * POST /api/auth/sign-up
 * Create new user account (admin only in production)
 */

import type { APIEvent } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { createDB } from '~/lib/db/client';
import { profiles, userRoles } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/auth/sign-up
 * Create a new user account
 */
export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { username, password, fullName, role = 'bendahara' } = body;

    if (!username || !password || !fullName) {
      return Response.json(
        { error: 'Username, password, and full name are required' },
        { status: 400 }
      );
    }

    const db = createDB(event.context.cloudflare?.env?.DB);
    const auth = createAuth(db);

    // Create user email
    const email = `${username.toLowerCase()}@pesantren.internal`;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(profiles)
      .where(eq(profiles.username, username.toLowerCase()))
      .get();

    if (existingUser) {
      return Response.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Create user with BetterAuth
    const user = await auth.api.signUp.emailPassword({
      body: {
        email,
        password,
        name: fullName,
      },
    });

    if (!user.user) {
      return Response.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create profile in our app schema
    const newProfile = await db.insert(profiles).values({
      id: user.user.id,
      username: username.toLowerCase(),
      fullName,
      isActive: true,
    }).returning().get();

    // Assign default role
    await db.insert(userRoles).values({
      userId: user.user.id,
      role: role,
    }).returning().get();

    return Response.json({
      success: true,
      user: user.user,
      profile: newProfile,
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return Response.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
