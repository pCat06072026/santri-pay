/**
 * Pembayaran API
 * GET /api/pembayaran - List all
 * POST /api/pembayaran - Create new
 */

import type { APIEvent } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { createDB } from '~/lib/db/client';
import { pembayaran, userRoles, tagihan, santai, kelas, jenisTagihan, tahunAjaran } from '~/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

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
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const pembayaranList = await db
      .select({
        id: pembayaran.id,
        tagihanId: pembayaran.tagihanId,
        tanggal: pembayaran.tanggal,
        jumlah: pembayaran.jumlah,
        metode: pembayaran.metode,
        referensi: pembayaran.referencia,
        catatan: pembayaran.catatan,
        buktiUrl: pembayaran.buktiUrl,
        nomorKwitansi: pembayaran.nomorKwitansi,
        createdAt: pembayaran.createdAt,
        studentNama: santai.namaLengkap,
        studentNis: santai.nis,
        kelasNama: kelas.nama,
        jenisTagihanNama: jenisTagihan.nama,
        tagihanPeriode: tagihan.periodeLabel,
        tahunAjaranNama: tahunAjaran.nama,
      })
      .from(pembayaran)
      .innerJoin(tagihan, eq(pembayaran.tagihanId, tagihan.id))
      .innerJoin(santri, eq(tagihan.studentId, santai.id))
      .innerJoin(jenisTagihan, eq(tagihan.jenisTagihanId, jenisTagihan.id))
      .innerJoin(tahunAjaran, eq(tagihan.tahunAjaranId, tahunAjaran.id))
      .leftJoin(kelas, eq(santri.kelasId, kelas.id))
      .orderBy(desc(pembayaran.tanggal))
      .limit(limit);

    // Get total this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const monthlyTotal = await db
      .select({ total: sql<number>`coalesce(sum(${pembayaran.jumlah}), 0)` })
      .from(pembayaran)
      .where(
        sql`${pembayaran.tanggal} >= ${startOfMonth} AND ${pembayaran.tanggal} <= ${endOfMonth}`
      )
      .get();

    return Response.json({
      pembayaran: pembayaranList,
      monthlyTotal: monthlyTotal?.total ?? 0,
    });
  } catch (error) {
    console.error('Get pembayaran error:', error);
    return Response.json({ error: 'Failed to get pembayaran' }, { status: 500 });
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
    const id = crypto.randomUUID();

    const newPembayaran = await db.insert(pembayaran).values({
      id,
      tagihanId: body.tagihanId,
      tanggal: body.tanggal || new Date().toISOString().slice(0, 10),
      jumlah: body.jumlah,
      metode: body.metode || 'tunai',
      referencia: body.referencia || null,
      catatan: body.catatan || null,
      buktiUrl: body.buktiUrl || null,
      dicatatOleh: session.user.id,
    }).returning().get();

    // Recalculate tagihan
    const tagihanData = await db
      .select()
      .from(tagihan)
      .where(eq(tagihan.id, body.tagihanId))
      .get();

    if (tagihanData) {
      const payments = await db
        .select({ total: sql<number>`coalesce(sum(${pembayaran.jumlah}), 0)` })
        .from(pembayaran)
        .where(eq(pembayaran.tagihanId, body.tagihanId))
        .get();

      const terbayar = payments?.total ?? 0;
      const sisa = Math.max(tagihanData.nominal - terbayar, 0);

      let status: 'belum_bayar' | 'sebagian' | 'lunas' | 'batal' = 'belum_bayar';
      if (terbayar <= 0) status = 'belum_bayar';
      else if (terbayar >= tagihanData.nominal) status = 'lunas';
      else status = 'sebagian';

      await db
        .update(tagihan)
        .set({ terbayar, sisa, status, updatedAt: new Date().toISOString() })
        .where(eq(tagihan.id, body.tagihanId))
        .run();
    }

    return Response.json({ pembayaran: newPembayaran }, { status: 201 });
  } catch (error) {
    console.error('Create pembayaran error:', error);
    return Response.json({ error: 'Failed to create pembayaran' }, { status: 500 });
  }
}
