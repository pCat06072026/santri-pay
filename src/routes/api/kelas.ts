/**
 * Kelas API
 * GET /api/kelas - List all
 * POST /api/kelas - Create new
 */

import type { APIEvent } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { createDB } from '~/lib/db/client';
import { kelas, tahunAjaran, userRoles, santai } from '~/lib/db/schema';
import { eq, asc, count } from 'drizzle-orm';

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

    const url = new URL(event.request.url);
    const tahunAjaranId = url.searchParams.get('tahunAjaranId');

    let kelasList;
    if (tahunAjaranId) {
      kelasList = await db
        .select({
          id: kelas.id,
          nama: kelas.nama,
          tingkat: kelas.tingkat,
          waliKelas: kelas.waliKelas,
          tahunAjaranId: kelas.tahunAjaranId,
          tahunAjaranNama: tahunAjaran.nama,
          createdAt: kelas.createdAt,
          updatedAt: kelas.updatedAt,
        })
        .from(kelas)
        .leftJoin(tahunAjaran, eq(kelas.tahunAjaranId, tahunAjaran.id))
        .where(eq(kelas.tahunAjaranId, tahunAjaranId))
        .orderBy(asc(kelas.tingkat), asc(kelas.nama));
    } else {
      kelasList = await db
        .select({
          id: kelas.id,
          nama: kelas.nama,
          tingkat: kelas.tingkat,
          waliKelas: kelas.waliKelas,
          tahunAjaranId: kelas.tahunAjaranId,
          tahunAjaranNama: tahunAjaran.nama,
          createdAt: kelas.createdAt,
          updatedAt: kelas.updatedAt,
        })
        .from(kelas)
        .leftJoin(tahunAjaran, eq(kelas.tahunAjaranId, tahunAjaran.id))
        .orderBy(asc(kelas.tingkat), asc(kelas.nama));
    }

    // Get student counts for each class
    const kelasWithCounts = await Promise.all(
      kelasList.map(async (k) => {
        const countResult = await db
          .select({ count: count() })
          .from(santri)
          .where(eq(santri.kelasId, k.id))
          .get();
        return { ...k, studentCount: countResult?.count ?? 0 };
      })
    );

    return Response.json({ kelas: kelasWithCounts });
  } catch (error) {
    console.error('Get kelas error:', error);
    return Response.json({ error: 'Failed to get kelas' }, { status: 500 });
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

    const newKelas = await db.insert(kelas).values({
      id,
      nama: body.nama,
      tingkat: body.tingkat,
      waliKelas: body.waliKelas || null,
      tahunAjaranId: body.tahunAjaranId,
    }).returning().get();

    return Response.json({ kelas: newKelas }, { status: 201 });
  } catch (error) {
    console.error('Create kelas error:', error);
    return Response.json({ error: 'Failed to create kelas' }, { status: 500 });
  }
}
