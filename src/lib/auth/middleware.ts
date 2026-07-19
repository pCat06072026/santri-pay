/**
 * Auth Middleware for TanStack Start
 *
 * Use this middleware to protect routes that require authentication.
 *
 * Usage:
 * import { requireAuth } from '~/lib/auth/middleware';
 *
 * export const Route = createFileRoute('/protected')({
 *   beforeLoad: requireAuth(),
 *   component: ProtectedPage,
 * });
 */

import type { BeforeLoadContext } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { createDB } from '~/lib/db/client';
import { profiles, userRoles } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface AuthContext {
  userId: string;
  session: {
    id: string;
    expiresAt: string;
  };
  profile: {
    id: string;
    username: string;
    fullName: string;
    isActive: boolean;
  } | null;
  role: 'admin' | 'bendahara' | null;
}

/**
 * Require authentication middleware
 * Returns user context if authenticated, throws redirect if not
 */
export function requireAuth() {
  return async (context: BeforeLoadContext) => {
    // This runs on the server only
    if (typeof window !== 'undefined') {
      // Client-side: fetch session from API
      const res = await fetch('/api/auth/session');
      if (!res.ok || res.status === 401) {
        throw new Error('Unauthorized');
      }
      const data = await res.json();
      if (!data.session) {
        throw new Error('Unauthorized');
      }
      return {
        auth: data as AuthContext,
      };
    }

    // Server-side: get session directly from DB
    const db = createDB(context.cloudflare?.env?.DB);
    const auth = createAuth(db);

    const session = await auth.api.getSession({
      headers: context.request?.headers,
    });

    if (!session) {
      throw new Error('Unauthorized');
    }

    // Get user profile
    const profile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, session.user.id))
      .get();

    const roles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, session.user.id));

    return {
      auth: {
        userId: session.user.id,
        session: {
          id: session.session.id,
          expiresAt: session.session.expiresAt,
        },
        profile,
        role: (roles[0]?.role as 'admin' | 'bendahara' | null) || null,
      },
    };
  };
}

/**
 * Require admin role middleware
 * Use after requireAuth()
 */
export function requireAdmin() {
  return async (context: BeforeLoadContext & { auth: AuthContext }) => {
    if (context.auth?.role !== 'admin') {
      throw new Error('Forbidden: Admin access required');
    }
  };
}

/**
 * Require specific role middleware
 */
export function requireRole(role: 'admin' | 'bendahara') {
  return async (context: BeforeLoadContext & { auth: AuthContext }) => {
    if (context.auth?.role !== role) {
      throw new Error(`Forbidden: ${role} access required`);
    }
  };
}
