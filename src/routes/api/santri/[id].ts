/**
 * Santri CRUD API
 * /api/santri/[id] - GET, PUT, DELETE single student
 */

import type { APIEvent } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { createDB } from '~/lib/db/client';
import { profiles, userRoles, santai } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/santri/[id]
 * Get single student by ID
 */
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
    const id = url.pathname.split('/').pop();

    const student = await db
      .select()
      .from(santri)
      .where(eq(santri.id, id))
      .get();

    if (!student) {
      return Response.json({ error: 'Student not found' }, { status: 404 });
    }

    return Response.json({ student });
  } catch (error) {
    console.error('Get student error:', error);
    return Response.json({ error: 'Failed to get student' }, { status: 500 });
  }
}

/**
 * PUT /api/santri/[id]
 * Update student
 */
export async function PUT(event: APIEvent) {
  try {
    const db = createDB(event.context.cloudflare?.env?.DB);
    const auth = createAuth(db);

    const session = await auth.api.getSession({
      headers: event.request.headers,
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const roles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, session.user.id));

    if (!roles.some(r => r.role === 'admin' || r.role === 'bendahara')) {
      return Response.json({ error: 'Forbidden: Staff access required' }, { status: 403 });
    }

    const url = new URL(event.request.url);
    const id = url.pathname.split('/').pop();
    const body = await event.request.json();

    const updated = await db
      .update(santri)
      .set({
        nis: body.nis,
        namaLengkap: body.namaLengkap,
        jenisKelamin: body.jenisKelamin,
        tanggalLahir: body.tanggalLahir,
        tempatLahir: body.tempatLahir,
        alamat: body.alamat,
        namaAyah: body.namaAyah,
        noWaAyah: body.noWaAyah,
        namaIbu: body.namaIbu,
        noWaIbu: body.noWaIbu,
        kelasId: body.kelasId,
        tahunMasuk: body.tahunMasuk,
        status: body.status,
        fotoUrl: body.fotoUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(santri.id, id))
      .returning()
      .get();

    if (!updated) {
      return Response.json({ error: 'Student not found' }, { status: 404 });
    }

    return Response.json({ student: updated });
  } catch (error) {
    console.error('Update student error:', error);
    return Response.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

/**
 * DELETE /api/santri/[id]
 * Delete student (admin only)
 */
export async function DELETE(event: APIEvent) {
  try {
    const db = createDB(event.context.cloudflare?.env?.DB);
    const auth = createAuth(db);

    const session = await auth.api.getSession({
      headers: event.request.headers,
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const roles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, session.user.id));

    if (!roles.some(r => r.role === 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const url = new URL(event.request.url);
    const id = url.pathname.split('/').pop();

    await db.delete(santri).where(eq(santri.id, id)).run();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    return Response.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
