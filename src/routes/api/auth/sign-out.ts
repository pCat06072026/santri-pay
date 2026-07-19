/**
 * POST /api/auth/sign-out
 * Sign out current user
 */

import type { APIEvent } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { createDB } from '~/lib/db/client';

/**
 * POST /api/auth/sign-out
 * Sign out the current session
 */
export async function POST(event: APIEvent) {
  try {
    const db = createDB(event.context.cloudflare?.env?.DB);
    const auth = createAuth(db);

    // Get session token from cookie or header
    const cookieHeader = event.request.headers.get('cookie') || '';
    const token = extractToken(cookieHeader);

    if (token) {
      await auth.api.signOut({
        headers: {
          cookie: cookieHeader,
        },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Sign out error:', error);
    return Response.json(
      { error: 'Sign out failed' },
      { status: 500 }
    );
  }
}

function extractToken(cookieHeader: string): string | null {
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies['better-auth.session_token'] || null;
}
