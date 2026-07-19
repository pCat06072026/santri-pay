/**
 * Tagihan API
 * GET /api/tagihan - List all
 * POST /api/tagihan - Create new
 */

import type { APIEvent } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { createDB } from '~/lib/db/client';
import { tagihan, userRoles, santai, kelas, jenisTagihan, tahunAjaran } from '~/lib/db/schema';
import { eq, desc, and, inArray, sql } from 'drizzle-orm';

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
    const studentId = url.searchParams.get('studentId');
    const status = url.searchParams.get('status');

    // Build query
    let query = db
      .select({
        id: tagihan.id,
        studentId: tagihan.studentId,
        jenisTagihanId: tagihan.jenisTagihanId,
        tahunAjaranId: tagihan.tahunAjaranId,
        periodeLabel: tagihan.periodeLabel,
        jatuhTempo: tagihan.jatuhTempo,
        nominal: tagihan.nominal,
        terbayar: tagihan.terbayar,
        sisa: tagihan.sisa,
        status: tagihan.status,
        catatan: tagihan.catatan,
        createdAt: tagihan.createdAt,
        updatedAt: tagihan.updatedAt,
        studentNama: santai.namaLengkap,
        studentNis: santai.nis,
        kelasNama: kelas.nama,
        jenisTagihanNama: jenisTagihan.nama,
      })
      .from(tagihan)
      .innerJoin(santri, eq(tagihan.studentId, santai.id))
      .innerJoin(jenisTagihan, eq(tagihan.jenisTagihanId, jenisTagihan.id))
      .leftJoin(kelas, eq(santri.kelasId, kelas.id))
      .orderBy(desc(tagihan.createdAt));

    // Get tagihan list
    const tagihanList = await query;

    // Filter in memory if needed
    let filtered = tagihanList;
    if (tahunAjaranId) {
      filtered = filtered.filter(t => t.tahunAjaranId === tahunAjaranId);
    }
    if (studentId) {
      filtered = filtered.filter(t => t.studentId === studentId);
    }
    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }

    // Get stats
    const [lunasCount, belumCount, sebagianCount, totalCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(tagihan).where(eq(tagihan.status, 'lunas')).get(),
      db.select({ count: sql<number>`count(*)` }).from(tagihan).where(eq(tagihan.status, 'belum_bayar')).get(),
      db.select({ count: sql<number>`count(*)` }).from(tagihan).where(eq(tagihan.status, 'sebagian')).get(),
      db.select({ count: sql<number>`count(*)` }).from(tagihan).get(),
    ]);

    return Response.json({
      tagihan: filtered,
      stats: {
        total: totalCount?.count ?? 0,
        lunas: lunasCount?.count ?? 0,
        belum: belumCount?.count ?? 0,
        sebagian: sebagianCount?.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Get tagihan error:', error);
    return Response.json({ error: 'Failed to get tagihan' }, { status: 500 });
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

    if (!roles.some(r => r.role === 'admin' || r.role === 'bendahara')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await event.request.json();

    // Generate ID
    const id = crypto.randomUUID();

    const newTagihan = await db.insert(tagihan).values({
      id,
      studentId: body.studentId,
      jenisTagihanId: body.jenisTagihanId,
      tahunAjaranId: body.tahunAjaranId,
      periodeLabel: body.periodeLabel,
      jatuhTempo: body.jatuhTempo || null,
      nominal: body.nominal,
      terbayar: 0,
      sisa: body.nominal,
      status: 'belum_bayar',
      catatan: body.catatan || null,
    }).returning().get();

    return Response.json({ tagihan: newTagihan }, { status: 201 });
  } catch (error) {
    console.error('Create tagihan error:', error);
    return Response.json({ error: 'Failed to create tagihan' }, { status: 500 });
  }
}
