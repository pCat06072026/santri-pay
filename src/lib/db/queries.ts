/**
 * Database Query Helpers
 *
 * Pre-built query functions for common operations
 * Use these instead of raw queries for consistency
 */

import { eq, and, desc, asc, like, or, inArray, sql, isNull, isNotNull } from 'drizzle-orm';
import type { Database } from './client';
import {
  profiles,
  userRoles,
  tahunAjaran,
  kelas,
  santai,
  jenisTagihan,
  tagihan,
  pembayaran,
  auditLogs,
  appSettings,
  whatsappLogs,
  riwayatKelas,
  kwitansiCounter,
  type Profile,
  type UserRole,
  type TahunAjaran,
  type Kelas,
  type Santri,
  type JenisTagihan,
  type Tagihan,
  type Pembayaran,
  type AppSetting,
  type KwitansiCounter,
} from './schema';

// ============================================================
// PROFILES & AUTH
// ============================================================

export async function getProfileById(db: Database, id: string) {
  return db.select().from(profiles).where(eq(profiles.id, id)).get();
}

export async function getProfileByUsername(db: Database, username: string) {
  return db.select().from(profiles).where(eq(profiles.username, username)).get();
}

export async function getAllProfiles(db: Database) {
  return db.select().from(profiles).orderBy(asc(profiles.fullName));
}

export async function createProfile(db: Database, data: typeof profiles.$inferInsert) {
  return db.insert(profiles).values(data).returning().get();
}

export async function updateProfile(db: Database, id: string, data: Partial<typeof profiles.$inferInsert>) {
  return db.update(profiles).set(data).where(eq(profiles.id, id)).returning().get();
}

// ============================================================
// USER ROLES
// ============================================================

export async function getUserRoles(db: Database, userId: string) {
  return db.select().from(userRoles).where(eq(userRoles.userId, userId));
}

export async function hasRole(db: Database, userId: string, role: 'admin' | 'bendahara'): Promise<boolean> {
  const result = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
    .get();
  return !!result;
}

export async function isAdmin(db: Database, userId: string): Promise<boolean> {
  return hasRole(db, userId, 'admin');
}

export async function isAdminOrBendahara(db: Database, userId: string): Promise<boolean> {
  const roles = await getUserRoles(db, userId);
  return roles.some(r => r.role === 'admin' || r.role === 'bendahara');
}

export async function assignRole(db: Database, userId: string, role: 'admin' | 'bendahara') {
  return db.insert(userRoles).values({ userId, role }).onConflictDoNothing().returning().get();
}

export async function removeRole(db: Database, userId: string, role: 'admin' | 'bendahara') {
  return db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.role, role))).run();
}

// ============================================================
// TAHUN AJARAN
// ============================================================

export async function getTahunAjaranList(db: Database) {
  return db.select().from(tahunAjaran).orderBy(desc(tahunAjaran.tanggalMulai));
}

export async function getActiveTahunAjaran(db: Database) {
  return db.select().from(tahunAjaran).where(eq(tahunAjaran.isAktif, true)).get();
}

export async function getTahunAjaranById(db: Database, id: string) {
  return db.select().from(tahunAjaran).where(eq(tahunAjaran.id, id)).get();
}

export async function createTahunAjaran(db: Database, data: typeof tahunAjaran.$inferInsert) {
  return db.insert(tahunAjaran).values(data).returning().get();
}

export async function updateTahunAjaran(db: Database, id: string, data: Partial<typeof tahunAjaran.$inferInsert>) {
  return db.update(tahunAjaran).set(data).where(eq(tahunAjaran.id, id)).returning().get();
}

export async function setActiveTahunAjaran(db: Database, id: string) {
  // Deactivate all first
  await db.update(tahunAjaran).set({ isAktif: false }).where(eq(tahunAjaran.isAktif, true)).run();
  // Activate the selected one
  return db.update(tahunAjaran).set({ isAktif: true }).where(eq(tahunAjaran.id, id)).returning().get();
}

export async function deleteTahunAjaran(db: Database, id: string) {
  return db.delete(tahunAjaran).where(eq(tahunAjaran.id, id)).run();
}

// ============================================================
// KELAS
// ============================================================

export async function getKelasList(db: Database, tahunAjaranId?: string) {
  if (tahunAjaranId) {
    return db.select().from(kelas).where(eq(kelas.tahunAjaranId, tahunAjaranId)).orderBy(asc(kelas.tingkat), asc(kelas.nama));
  }
  return db.select().from(kelas).orderBy(asc(kelas.tingkat), asc(kelas.nama));
}

export async function getKelasById(db: Database, id: string) {
  return db.select().from(kelas).where(eq(kelas.id, id)).get();
}

export async function getKelasWithStats(db: Database, tahunAjaranId: string) {
  const kelasList = await db
    .select()
    .from(kelas)
    .where(eq(kelas.tahunAjaranId, tahunAjaranId))
    .orderBy(asc(kelas.tingkat), asc(kelas.nama));

  // Get student counts for each class
  const result = await Promise.all(
    kelasList.map(async (k) => {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(santri)
        .where(and(eq(santri.kelasId, k.id), eq(santri.status, 'aktif')))
        .get();
      return { ...k, studentCount: count?.count ?? 0 };
    })
  );

  return result;
}

export async function createKelas(db: Database, data: typeof kelas.$inferInsert) {
  return db.insert(kelas).values(data).returning().get();
}

export async function updateKelas(db: Database, id: string, data: Partial<typeof kelas.$inferInsert>) {
  return db.update(kelas).set(data).where(eq(kelas.id, id)).returning().get();
}

export async function deleteKelas(db: Database, id: string) {
  return db.delete(kelas).where(eq(kelas.id, id)).run();
}

// ============================================================
// SANTRI
// ============================================================

export async function getSantriList(db: Database, filters?: { status?: string; kelasId?: string; search?: string }) {
  let query = db.select().from(santri);

  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(santri.status, filters.status));
  }
  if (filters?.kelasId) {
    conditions.push(eq(santri.kelasId, filters.kelasId));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(santri.namaLengkap, `%${filters.search}%`),
        like(santri.nis, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    return db.select().from(santri).where(and(...conditions)).orderBy(asc(santri.namaLengkap));
  }

  return query.orderBy(asc(santri.namaLengkap));
}

export async function getSantriById(db: Database, id: string) {
  return db.select().from(santri).where(eq(santri.id, id)).get();
}

export async function getSantriByNis(db: Database, nis: string) {
  return db.select().from(santri).where(eq(santri.nis, nis)).get();
}

export async function getSantriStats(db: Database) {
  const total = await db.select({ count: sql<number>`count(*)` }).from(santri).get();
  const aktif = await db.select({ count: sql<number>`count(*)` }).from(santri).where(eq(santri.status, 'aktif')).get();
  const lulus = await db.select({ count: sql<number>`count(*)` }).from(santri).where(eq(santri.status, 'lulus')).get();
  const keluar = await db.select({ count: sql<number>`count(*)` }).from(santri).where(
    or(eq(santri.status, 'keluar'), eq(santri.status, 'pindah'))
  ).get();

  return {
    total: total?.count ?? 0,
    aktif: aktif?.count ?? 0,
    lulus: lulus?.count ?? 0,
    keluar: keluar?.count ?? 0,
  };
}

export async function createSantri(db: Database, data: typeof santai.$inferInsert) {
  return db.insert(santri).values(data).returning().get();
}

export async function updateSantri(db: Database, id: string, data: Partial<typeof santai.$inferInsert>) {
  return db.update(santri).set(data).where(eq(santri.id, id)).returning().get();
}

export async function deleteSantri(db: Database, id: string) {
  return db.delete(santri).where(eq(santri.id, id)).run();
}

// ============================================================
// JENIS TAGIHAN
// ============================================================

export async function getJenisTagihanList(db: Database, aktifOnly = true) {
  if (aktifOnly) {
    return db.select().from(jenisTagihan).where(eq(jenisTagihan.isAktif, true)).orderBy(asc(jenisTagihan.nama));
  }
  return db.select().from(jenisTagihan).orderBy(asc(jenisTagihan.nama));
}

export async function getJenisTagihanById(db: Database, id: string) {
  return db.select().from(jenisTagihan).where(eq(jenisTagihan.id, id)).get();
}

export async function createJenisTagihan(db: Database, data: typeof jenisTagihan.$inferInsert) {
  return db.insert(jenisTagihan).values(data).returning().get();
}

export async function updateJenisTagihan(db: Database, id: string, data: Partial<typeof jenisTagihan.$inferInsert>) {
  return db.update(jenisTagihan).set(data).where(eq(jenisTagihan.id, id)).returning().get();
}

export async function deleteJenisTagihan(db: Database, id: string) {
  return db.delete(jenisTagihan).where(eq(jenisTagihan.id, id)).run();
}

// ============================================================
// TAGIHAN
// ============================================================

export async function getTagihanList(db: Database, filters?: {
  tahunAjaranId?: string;
  studentId?: string;
  status?: string;
}) {
  let query = db.select().from(tagihan);

  const conditions = [];
  if (filters?.tahunAjaranId) conditions.push(eq(tagihan.tahunAjaranId, filters.tahunAjaranId));
  if (filters?.studentId) conditions.push(eq(tagihan.studentId, filters.studentId));
  if (filters?.status) conditions.push(eq(tagihan.status, filters.status));

  if (conditions.length > 0) {
    return db.select().from(tagihan).where(and(...conditions)).orderBy(desc(tagihan.createdAt));
  }

  return query.orderBy(desc(tagihan.createdAt));
}

export async function getTagihanById(db: Database, id: string) {
  return db.select().from(tagihan).where(eq(tagihan.id, id)).get();
}

export async function getTagihanWithDetails(db: Database, id: string) {
  const result = await db
    .select({
      tagihan: tagihan,
      student: santai,
      jenisTagihan: jenisTagihan,
      tahunAjaran: tahunAjaran,
      kelas: kelas,
    })
    .from(tagihan)
    .innerJoin(santri, eq(tagihan.studentId, santai.id))
    .innerJoin(jenisTagihan, eq(tagihan.jenisTagihanId, jenisTagihan.id))
    .innerJoin(tahunAjaran, eq(tagihan.tahunAjaranId, tahunAjaran.id))
    .leftJoin(kelas, eq(santri.kelasId, kelas.id))
    .where(eq(tagihan.id, id))
    .get();

  return result;
}

export async function createTagihan(db: Database, data: typeof tagihan.$inferInsert) {
  return db.insert(tagihan).values(data).onConflictDoNothing().returning().get();
}

export async function bulkCreateTagihan(db: Database, data: typeof tagihan.$inferInsert[]) {
  return db.insert(tagihan).values(data).onConflictDoNothing().returning();
}

export async function updateTagihan(db: Database, id: string, data: Partial<typeof tagihan.$inferInsert>) {
  return db.update(tagihan).set(data).where(eq(tagihan.id, id)).returning().get();
}

export async function deleteTagihan(db: Database, id: string) {
  return db.delete(tagihan).where(eq(tagihan.id, id)).run();
}

export async function recalcTagihan(db: Database, tagihanId: string) {
  // Get current tagihan
  const current = await getTagihanById(db, tagihanId);
  if (!current) return;

  // Calculate total payments
  const payments = await db
    .select({ total: sql<number>`coalesce(sum(${pembayaran.jumlah}), 0)` })
    .from(pembayaran)
    .where(eq(pembayaran.tagihanId, tagihanId))
    .get();

  const terbayar = payments?.total ?? 0;
  const sisa = Math.max(current.nominal - terbayar, 0);

  let status: 'belum_bayar' | 'sebagian' | 'lunas' | 'batal' = 'belum_bayar';
  if (current.status === 'batal') {
    status = 'batal';
  } else if (terbayar <= 0) {
    status = 'belum_bayar';
  } else if (terbayar >= current.nominal) {
    status = 'lunas';
  } else {
    status = 'sebagian';
  }

  return db.update(tagihan).set({ terbayar, sisa, status }).where(eq(tagihan.id, tagihanId)).returning().get();
}

// ============================================================
// PEMBAYARAN
// ============================================================

export async function getPembayaranByTagihan(db: Database, tagihanId: string) {
  return db
    .select()
    .from(pembayaran)
    .where(eq(pembayaran.tagihanId, tagihanId))
    .orderBy(desc(pembayaran.tanggal));
}

export async function getPembayaranById(db: Database, id: string) {
  return db.select().from(pembayaran).where(eq(pembayaran.id, id)).get();
}

export async function createPembayaran(db: Database, data: typeof pembayaran.$inferInsert) {
  return db.insert(pembayaran).values(data).returning().get();
}

export async function updatePembayaran(db: Database, id: string, data: Partial<typeof pembayaran.$inferInsert>) {
  return db.update(pembayaran).set(data).where(eq(pembayaran.id, id)).returning().get();
}

export async function deletePembayaran(db: Database, id: string) {
  const payment = await getPembayaranById(db, id);
  await db.delete(pembayaran).where(eq(pembayaran.id, id)).run();
  // Recalc tagihan after delete
  if (payment) {
    await recalcTagihan(db, payment.tagihanId);
  }
  return payment;
}

// ============================================================
// KWITANSI
// ============================================================

export async function assignNomorKwitansi(db: Database, pembayaranId: string, tahunAjaranId: string, prefix = 'KWT') {
  // Get or create counter
  let counter = await db
    .select()
    .from(kwitansiCounter)
    .where(eq(kwitansiCounter.tahunAjaranId, tahunAjaranId))
    .get();

  if (!counter) {
    await db.insert(kwitansiCounter).values({ tahunAjaranId, lastNumber: 0 }).run();
    counter = await db
      .select()
      .from(kwitansiCounter)
      .where(eq(kwitansiCounter.tahunAjaranId, tahunAjaranId))
      .get();
  }

  const nextNumber = (counter?.lastNumber ?? 0) + 1;
  const tahun = new Date().getFullYear();
  const nomor = `${prefix}/${tahun}/${String(nextNumber).padStart(4, '0')}`;

  // Update counter
  await db
    .update(kwitansiCounter)
    .set({ lastNumber: nextNumber })
    .where(eq(kwitansiCounter.tahunAjaranId, tahunAjaranId))
    .run();

  // Update pembayaran
  await db
    .update(pembayaran)
    .set({ nomorKwitansi: nomor })
    .where(and(eq(pembayaran.id, pembayaranId), isNull(pembayaran.nomorKwitansi)))
    .run();

  return nomor;
}

// ============================================================
// AUDIT LOGS
// ============================================================

export async function createAuditLog(
  db: Database,
  data: {
    tableName: string;
    recordId: string;
    action: 'create' | 'update' | 'delete';
    changedBy?: string;
    oldData?: unknown;
    newData?: unknown;
  }
) {
  return db.insert(auditLogs).values({
    tableName: data.tableName,
    recordId: data.recordId,
    action: data.action,
    changedBy: data.changedBy,
    oldData: data.oldData ? JSON.stringify(data.oldData) : null,
    newData: data.newData ? JSON.stringify(data.newData) : null,
  }).returning().get();
}

export async function getAuditLogs(db: Database, limit = 100) {
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

// ============================================================
// APP SETTINGS
// ============================================================

export async function getAppSetting(db: Database, key: string) {
  return db.select().from(appSettings).where(eq(appSettings.key, key)).get();
}

export async function getAllAppSettings(db: Database) {
  return db.select().from(appSettings);
}

export async function setAppSetting(db: Database, key: string, value: string, updatedBy?: string) {
  return db
    .insert(appSettings)
    .values({ key, value, updatedBy })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date().toISOString() } })
    .returning()
    .get();
}

// ============================================================
// WHATSAPP LOGS
// ============================================================

export async function createWhatsAppLog(db: Database, data: {
  tagihanId?: string;
  studentId?: string;
  nomorTujuan: string;
  pesan: string;
  status: 'terkirim' | 'gagal';
  keterangan?: string;
  createdBy?: string;
}) {
  return db.insert(whatsappLogs).values(data).returning().get();
}

export async function getWhatsAppLogs(db: Database, limit = 100) {
  return db
    .select()
    .from(whatsappLogs)
    .orderBy(desc(whatsappLogs.createdAt))
    .limit(limit);
}

// ============================================================
// REPORTS
// ============================================================

export async function getMonthlyIncome(db: Database, tahunAjaranId: string) {
  const result = await db
    .select({
      total: sql<number>`sum(${pembayaran.jumlah})`,
    })
    .from(pembayaran)
    .innerJoin(tagihan, eq(pembayaran.tagihanId, tagihan.id))
    .where(eq(tagihan.tahunAjaranId, tahunAjaranId))
    .get();

  return result?.total ?? 0;
}

export async function getTagihanStats(db: Database, tahunAjaranId: string) {
  const totalTagihan = await db
    .select({ count: sql<number>`count(*)` })
    .from(tagihan)
    .where(eq(tagihan.tahunAjaranId, tahunAjaranId))
    .get();

  const lunas = await db
    .select({ count: sql<number>`count(*)` })
    .from(tagihan)
    .where(and(eq(tagihan.tahunAjaranId, tahunAjaranId), eq(tagihan.status, 'lunas')))
    .get();

  const belumBayar = await db
    .select({ count: sql<number>`count(*)` })
    .from(tagihan)
    .where(and(eq(tagihan.tahunAjaranId, tahunAjaranId), eq(tagihan.status, 'belum_bayar')))
    .get();

  const sebagian = await db
    .select({ count: sql<number>`count(*)` })
    .from(tagihan)
    .where(and(eq(tagihan.tahunAjaranId, tahunAjaranId), eq(tagihan.status, 'sebagian')))
    .get();

  return {
    totalTagihan: totalTagihan?.count ?? 0,
    lunas: lunas?.count ?? 0,
    belumBayar: belumBayar?.count ?? 0,
    sebagian: sebagian?.count ?? 0,
  };
}

export async function getRecentPayments(db: Database, limit = 10) {
  return db
    .select({
      pembayaran: pembayaran,
      student: santai,
      tagihan: tagihan,
    })
    .from(pembayaran)
    .innerJoin(tagihan, eq(pembayaran.tagihanId, tagihan.id))
    .innerJoin(santri, eq(tagihan.studentId, santai.id))
    .orderBy(desc(pembayaran.tanggal))
    .limit(limit);
}

export async function getTunggakanList(db: Database, tahunAjaranId: string) {
  return db
    .select({
      student: santai,
      kelas: kelas,
      totalTagihan: sql<number>`sum(${tagihan.nominal})`,
      totalTerbayar: sql<number>`sum(${tagihan.terbayar})`,
      totalSisa: sql<number>`sum(${tagihan.sisa})`,
      countTagihan: sql<number>`count(*)`,
    })
    .from(tagihan)
    .innerJoin(santri, eq(tagihan.studentId, santai.id))
    .leftJoin(kelas, eq(santri.kelasId, kelas.id))
    .where(and(
      eq(tagihan.tahunAjaranId, tahunAjaranId),
      sql`${tagihan.sisa} > 0`
    ))
    .groupBy(santri.id, kelas.id)
    .orderBy(desc(sql`total_sisa`));
}
