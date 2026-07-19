/**
 * Santri API - CRUD operations for students
 * GET /api/santri - List all students
 * POST /api/santri - Create new student
 */

import type { APIEvent } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { createDB } from '~/lib/db/client';
import { profiles, userRoles, santai, kelas, tahunAjaran } from '~/lib/db/schema';
import { eq, asc, like, or, and, count } from 'drizzle-orm';

/**
 * GET /api/santri
 * List all students with optional filters
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

    // Get query params
    const url = new URL(event.request.url);
    const status = url.searchParams.get('status');
    const kelasId = url.searchParams.get('kelasId');
    const search = url.searchParams.get('search');

    // Build conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(santri.status, status));
    }
    if (kelasId) {
      conditions.push(eq(santri.kelasId, kelasId));
    }
    if (search) {
      conditions.push(
        or(
          like(santri.namaLengkap, `%${search}%`),
          like(santri.nis, `%${search}%`)
        )
      );
    }

    // Get students with class info
    let students;
    if (conditions.length > 0) {
      students = await db
        .select({
          id: santai.id,
          nis: santai.nis,
          namaLengkap: santai.namaLengkap,
          jenisKelamin: santai.jenisKelamin,
          tanggalLahir: santai.tanggalLahir,
          tempatLahir: santai.tempatLahir,
          alamat: santai.alamat,
          namaAyah: santai.namaAyah,
          noWaAyah: santai.noWaAyah,
          namaIbu: santai.namaIbu,
          noWaIbu: santai.noWaIbu,
          kelasId: santai.kelasId,
          tahunMasuk: santai.tahunMasuk,
          status: santai.status,
          fotoUrl: santai.fotoUrl,
          createdAt: santai.createdAt,
          updatedAt: santai.updatedAt,
          kelasNama: kelas.nama,
          kelasTingkat: kelas.tingkat,
        })
        .from(santri)
        .leftJoin(kelas, eq(santri.kelasId, kelas.id))
        .where(and(...conditions))
        .orderBy(asc(santri.namaLengkap));
    } else {
      students = await db
        .select({
          id: santai.id,
          nis: santai.nis,
          namaLengkap: santai.namaLengkap,
          jenisKelamin: santai.jenisKelamin,
          tanggalLahir: santai.tanggalLahir,
          tempatLahir: santai.tempatLahir,
          alamat: santai.alamat,
          namaAyah: santai.namaAyah,
          noWaAyah: santai.noWaAyah,
          namaIbu: santai.namaIbu,
          noWaIbu: santai.noWaIbu,
          kelasId: santai.kelasId,
          tahunMasuk: santai.tahunMasuk,
          status: santai.status,
          fotoUrl: santai.fotoUrl,
          createdAt: santai.createdAt,
          updatedAt: santai.updatedAt,
          kelasNama: kelas.nama,
          kelasTingkat: kelas.tingkat,
        })
        .from(santri)
        .leftJoin(kelas, eq(santri.kelasId, kelas.id))
        .orderBy(asc(santri.namaLengkap));
    }

    // Get counts
    const [
      totalCount,
      aktifCount,
      lulusCount,
      keluarCount,
    ] = await Promise.all([
      db.select({ count: count() }).from(santri).get(),
      db.select({ count: count() }).from(santri).where(eq(santri.status, 'aktif')).get(),
      db.select({ count: count() }).from(santri).where(eq(santri.status, 'lulus')).get(),
      db.select({ count: count() }).from(santri).where(
        or(eq(santri.status, 'keluar'), eq(santri.status, 'pindah'))
      ).get(),
    ]);

    return Response.json({
      students,
      counts: {
        total: totalCount?.count ?? 0,
        aktif: aktifCount?.count ?? 0,
        lulus: lulusCount?.count ?? 0,
        keluar: keluarCount?.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Get students error:', error);
    return Response.json({ error: 'Failed to get students' }, { status: 500 });
  }
}

/**
 * POST /api/santri
 * Create new student
 */
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

    // Check admin role
    const roles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, session.user.id));

    if (!roles.some(r => r.role === 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await event.request.json();

    // Generate ID
    const id = crypto.randomUUID();

    const newSantri = await db.insert(santri).values({
      id,
      nis: body.nis,
      namaLengkap: body.namaLengkap,
      jenisKelamin: body.jenisKelamin,
      tanggalLahir: body.tanggalLahir || null,
      tempatLahir: body.tempatLahir || null,
      alamat: body.alamat || null,
      namaAyah: body.namaAyah,
      noWaAyah: body.noWaAyah,
      namaIbu: body.namaIbu || null,
      noWaIbu: body.noWaIbu || null,
      kelasId: body.kelasId || null,
      tahunMasuk: body.tahunMasuk,
      status: body.status || 'aktif',
      fotoUrl: body.fotoUrl || null,
    }).returning().get();

    return Response.json({ student: newSantri }, { status: 201 });
  } catch (error) {
    console.error('Create student error:', error);
    return Response.json({ error: 'Failed to create student' }, { status: 500 });
  }
}
