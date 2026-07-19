/**
 * Tagihan Detail API
 * GET /api/tagihan/[id]
 */

import type { APIEvent } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { createDB } from '~/lib/db/client';
import { tagihan, santai, kelas, jenisTagihan, tahunAjaran, pembayaran } from '~/lib/db/schema';
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

    // Extract ID from URL path
    const url = new URL(event.request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    // Get tagihan with details
    const tagihanData = await db
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
      })
      .from(tagihan)
      .where(eq(tagihan.id, id))
      .get();

    if (!tagihanData) {
      return Response.json({ error: 'Tagihan not found' }, { status: 404 });
    }

    // Get student details
    const student = await db
      .select({
        id: santai.id,
        nis: santai.nis,
        namaLengkap: santai.namaLengkap,
        namaAyah: santai.namaAyah,
        noWaAyah: santai.noWaAyah,
        noWaIbu: santai.noWaIbu,
        kelasId: santai.kelasId,
        kelasNama: kelas.nama,
        kelasTingkat: kelas.tingkat,
      })
      .from(santri)
      .leftJoin(kelas, eq(santri.kelasId, kelas.id))
      .where(eq(santri.id, tagihanData.studentId))
      .get();

    // Get payment history
    const payments = await db
      .select({
        id: pembayaran.id,
        tanggal: pembayaran.tanggal,
        jumlah: pembayaran.jumlah,
        metode: pembayaran.metode,
        referencia: pembayaran.referencia,
        catatan: pembayaran.catatan,
        nomorKwitansi: pembayaran.nomorKwitansi,
        createdAt: pembayaran.createdAt,
      })
      .from(pembayaran)
      .where(eq(pembayaran.tagihanId, id))
      .orderBy(desc(pembayaran.tanggal));

    return Response.json({
      tagihan: {
        ...tagihanData,
        studentNama: student?.namaLengkap,
        studentNis: student?.nis,
        noWaAyah: student?.noWaAyah,
        noWaIbu: student?.noWaIbu,
        kelasId: student?.kelasId,
        kelasNama: student?.kelasNama ? `${student?.kelasTingkat || ''} ${student?.kelasNama}`.trim() : null,
        pembayaran: payments,
      },
    });
  } catch (error) {
    console.error('Get tagihan detail error:', error);
    return Response.json({ error: 'Failed to get tagihan' }, { status: 500 });
  }
}
