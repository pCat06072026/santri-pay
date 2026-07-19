/**
 * Dashboard API - Get dashboard statistics
 * GET /api/dashboard/stats
 */

import type { APIEvent } from '@tanstack/react-start/server';
import { createAuth } from '~/lib/auth/auth';
import { createDB } from '~/lib/db/client';
import { profiles, userRoles } from '~/lib/db/schema';
import { eq, sql, ne, count } from 'drizzle-orm';

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
export async function GET(event: APIEvent) {
  try {
    // Check authentication
    const db = createDB(event.context.cloudflare?.env?.DB);
    const auth = createAuth(db);

    const session = await auth.api.getSession({
      headers: event.request.headers,
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get counts
    const [
      totalSantri,
      aktifSantri,
      lulusSantri,
      keluarSantri,
      totalKelas,
      tagihanStats,
      totalNominal,
      totalTerbayar,
      totalSisa,
    ] = await Promise.all([
      // Total Santri
      db.select({ count: count() }).from(profiles).get(),
      // Aktif Santri
      db.select({ count: count() }).from(profiles).where(eq(profiles.isActive, true)).get(),
      // Lulus (this would need a different table, using profiles for now)
      db.select({ count: count() }).from(profiles).get(),
      // Keluar (this would need a different table)
      db.select({ count: count() }).from(profiles).get(),
      // Total Kelas
      db.select({ count: count() }).from(profiles).get(),
      // Tagihan stats - simplified
      db.select({ count: count() }).from(profiles).get(),
      // Total Nominal
      db.select({ count: count() }).from(profiles).get(),
      // Total Terbayar
      db.select({ count: count() }).from(profiles).get(),
      // Total Sisa
      db.select({ count: count() }).from(profiles).get(),
    ]);

    return Response.json({
      counts: {
        total: totalSantri?.count ?? 0,
        aktif: aktifSantri?.count ?? 0,
        lulus: 0,
        keluar: 0,
        kelas: totalKelas?.count ?? 0,
      },
      tagihan: {
        lunas: 0,
        belum: 0,
        sebagian: 0,
        totalNominal: 0,
        totalTerbayar: 0,
        totalSisa: 0,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return Response.json({ error: 'Failed to get dashboard stats' }, { status: 500 });
  }
}
