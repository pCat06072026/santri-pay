/**
 * GET /api/auth/session
 * Get current session
 */

import type { APIEvent } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { createDB } from '~/lib/db/client';
import { profiles, userRoles } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/auth/session
 * Get the current user's session
 */
export async function GET(event: APIEvent) {
  try {
    const db = createDB(event.context.cloudflare?.env?.DB);
    const auth = createAuth(db);

    // Get session from request
    const session = await auth.api.getSession({
      headers: event.request.headers,
    });

    if (!session) {
      return Response.json({ session: null, profile: null, role: null });
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
    console.error('Get session error:', error);
    return Response.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
