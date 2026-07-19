/**
 * Tahun Ajaran API
 * GET /api/tahun-ajaran - List all
 * POST /api/tahun-ajaran - Create new
 */

import type { APIEvent } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { createDB } from '~/lib/db/client';
import { tahunAjaran, userRoles } from '~/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(event: APIEvent) {
  try {
    const db = createDB(event.context.cloudflare?.env?.DB);
    const auth = createAuth(db);

    const session = await auth.api.getSession({
      headers: event.request.headers,
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tahunAjaranList = await db
      .select()
      .from(tahunAjaran)
      .orderBy(desc(tahunAjaran.tanggalMulai));

    return Response.json({ tahunAjaran: tahunAjaranList });
  } catch (error) {
    console.error('Get tahun ajaran error:', error);
    return Response.json({ error: 'Failed to get tahun ajaran' }, { status: 500 });
  }
}

export async function POST(event: APIEvent) {
  try {
    const db = createDB(event.context.cloudflare?.env?.DB);
    const auth = createAuth(db);

    const session = await auth.api.getSession({
      headers: event.request.headers,
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, session.user.id));

    if (!roles.some(r => r.role === 'admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await event.request.json();
    const id = crypto.randomUUID();

    const newTahunAjaran = await db.insert(tahunAjaran).values({
      id,
      nama: body.nama,
      tanggalMulai: body.tanggalMulai,
      tanggalSelesai: body.tanggalSelesai,
      isAktif: body.isAktif || false,
    }).returning().get();

    return Response.json({ tahunAjaran: newTahunAjaran }, { status: 201 });
  } catch (error) {
    console.error('Create tahun ajaran error:', error);
    return Response.json({ error: 'Failed to create tahun ajaran' }, { status: 500 });
  }
}
