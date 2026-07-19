/**
 * Santri-Pay D1 Database Schema
 * Converted from PostgreSQL (Supabase) to SQLite (Cloudflare D1)
 */

import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// ============================================================
// TABLE DEFINITIONS (in order respecting foreign keys)
// ============================================================

// 1. PROFILES (User accounts)
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  fullName: text('full_name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 2. USER ROLES (references profiles)
export const userRoles = sqliteTable('user_roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 3. TAHUN AJARAN (Academic Years)
export const tahunAjaran = sqliteTable('tahun_ajaran', {
  id: text('id').primaryKey().default('CURRENT_TIMESTAMP'),
  nama: text('nama').notNull().unique(),
  tanggalMulai: text('tanggal_mulai').notNull(),
  tanggalSelesai: text('tanggal_selesai').notNull(),
  isAktif: integer('is_aktif', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 4. JENIS TAGIHAN (references none)
export const jenisTagihan = sqliteTable('jenis_tagihan', {
  id: text('id').primaryKey().default('CURRENT_TIMESTAMP'),
  nama: text('nama').notNull().unique(),
  deskripsi: text('deskripsi'),
  nominalDefault: real('nominal_default').notNull().default(0),
  periode: text('periode').notNull().default('bulanan'),
  isAktif: integer('is_aktif', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 5. KELAS (references tahunAjaran)
export const kelas = sqliteTable('kelas', {
  id: text('id').primaryKey().default('CURRENT_TIMESTAMP'),
  nama: text('nama').notNull(),
  tingkat: text('tingkat').notNull(),
  waliKelas: text('wali_kelas'),
  tahunAjaranId: text('tahun_ajaran_id').notNull().references(() => tahunAjaran.id, { onDelete: 'restrict' }),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 6. SANTRI (references kelas)
export const santai = sqliteTable('santri', {
  id: text('id').primaryKey().default('CURRENT_TIMESTAMP'),
  nis: text('nis').notNull().unique(),
  namaLengkap: text('nama_lengkap').notNull(),
  jenisKelamin: text('jenis_kelamin').notNull(),
  tanggalLahir: text('tanggal_lahir'),
  tempatLahir: text('tempat_lahir'),
  alamat: text('alamat'),
  namaAyah: text('nama_ayah').notNull(),
  noWaAyah: text('no_wa_ayah').notNull(),
  namaIbu: text('nama_ibu'),
  noWaIbu: text('no_wa_ibu'),
  kelasId: text('kelas_id').references(() => kelas.id, { onDelete: 'set null' }),
  tahunMasuk: integer('tahun_masuk').notNull(),
  status: text('status').notNull().default('aktif'),
  fotoUrl: text('foto_url'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 7. TAGIHAN (references santai, jenisTagihan, tahunAjaran)
export const tagihan = sqliteTable('tagihan', {
  id: text('id').primaryKey().default('CURRENT_TIMESTAMP'),
  studentId: text('santri_id').notNull().references(() => santai.id, { onDelete: 'cascade' }),
  jenisTagihanId: text('jenis_tagihan_id').notNull().references(() => jenisTagihan.id, { onDelete: 'restrict' }),
  tahunAjaranId: text('tahun_ajaran_id').notNull().references(() => tahunAjaran.id, { onDelete: 'restrict' }),
  periodeLabel: text('periode_label').notNull(),
  jatuhTempo: text('jatuh_tempo'),
  nominal: real('nominal').notNull().default(0),
  terbayar: real('terbayar').notNull().default(0),
  sisa: real('sisa').notNull().default(0),
  status: text('status').notNull().default('belum_bayar'),
  catatan: text('catatan'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 8. PEMBAYARAN (references tagihan, profiles)
export const pembayaran = sqliteTable('pembayaran', {
  id: text('id').primaryKey().default('CURRENT_TIMESTAMP'),
  tagihanId: text('tagihan_id').notNull().references(() => tagihan.id, { onDelete: 'cascade' }),
  tanggal: text('tanggal').notNull().default('CURRENT_DATE'),
  jumlah: real('jumlah').notNull(),
  metode: text('metode').notNull().default('tunai'),
  referencia: text('referencia'),
  catatan: text('catatan'),
  buktiUrl: text('bukti_url'),
  nomorKwitansi: text('nomor_kwitansi'),
  dicatatOleh: text('dicatat_oleh').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 9. AUDIT LOGS (references profiles)
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey().default('CURRENT_TIMESTAMP'),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  action: text('action').notNull(),
  changedBy: text('changed_by').references(() => profiles.id, { onDelete: 'set null' }),
  oldData: text('old_data'),
  newData: text('new_data'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 10. APP SETTINGS (references profiles)
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedBy: text('updated_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 11. KWITANSI COUNTER (references tahunAjaran)
export const kwitansiCounter = sqliteTable('kwitansi_counter', {
  tahunAjaranId: text('tahun_ajaran_id').primaryKey().references(() => tahunAjaran.id, { onDelete: 'cascade' }),
  lastNumber: integer('last_number').notNull().default(0),
});

// 12. RIWAYAT KELAS (references santai, kelas, tahunAjaran, profiles)
export const riwayatKelas = sqliteTable('riwayat_kelas', {
  id: text('id').primaryKey().default('CURRENT_TIMESTAMP'),
  studentId: text('santri_id').notNull().references(() => santai.id, { onDelete: 'cascade' }),
  kelasId: text('kelas_id').references(() => kelas.id, { onDelete: 'set null' }),
  tahunAjaranId: text('tahun_ajaran_id').references(() => tahunAjaran.id, { onDelete: 'set null' }),
  kelasNama: text('kelas_nama'),
  tahunAjaranNama: text('tahun_ajaran_nama'),
  jenis: text('jenis').notNull(),
  catatan: text('catatan'),
  dicatatOleh: text('dicatat_oleh').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// 13. WHATSAPP LOGS (references tagihan, santai, profiles)
export const whatsappLogs = sqliteTable('whatsapp_logs', {
  id: text('id').primaryKey().default('CURRENT_TIMESTAMP'),
  tagihanId: text('tagihan_id').references(() => tagihan.id, { onDelete: 'set null' }),
  studentId: text('santri_id').references(() => santai.id, { onDelete: 'set null' }),
  nomorTujuan: text('nomor_tujuan').notNull(),
  pesan: text('pesan').notNull(),
  status: text('status').notNull(),
  keterangan: text('keterangan'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
  createdBy: text('created_by').references(() => profiles.id, { onDelete: 'set null' }),
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

export type TahunAjaran = typeof tahunAjaran.$inferSelect;
export type NewTahunAjaran = typeof tahunAjaran.$inferInsert;

export type Kelas = typeof kelas.$inferSelect;
export type NewKelas = typeof kelas.$inferInsert;

export type Santri = typeof santai.$inferSelect;
export type NewSantri = typeof santai.$inferInsert;

export type JenisTagihan = typeof jenisTagihan.$inferSelect;
export type NewJenisTagihan = typeof jenisTagihan.$inferInsert;

export type Tagihan = typeof tagihan.$inferSelect;
export type NewTagihan = typeof tagihan.$inferInsert;

export type Pembayaran = typeof pembayaran.$inferSelect;
export type NewPembayaran = typeof pembayaran.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;

export type WhatsAppLog = typeof whatsappLogs.$inferSelect;
export type NewWhatsAppLog = typeof whatsappLogs.$inferInsert;

export type RiwayatKelas = typeof riwayatKelas.$inferSelect;
export type NewRiwayatKelas = typeof riwayatKelas.$inferInsert;

export type KwitansiCounter = typeof kwitansiCounter.$inferSelect;
export type NewKwitansiCounter = typeof kwitansiCounter.$inferInsert;
