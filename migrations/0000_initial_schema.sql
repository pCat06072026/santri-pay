CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_by` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`table_name` text NOT NULL,
	`record_id` text NOT NULL,
	`action` text NOT NULL,
	`changed_by` text,
	`old_data` text,
	`new_data` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`changed_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `jenis_tagihan` (
	`id` text PRIMARY KEY DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`nama` text NOT NULL,
	`deskripsi` text,
	`nominal_default` real DEFAULT 0 NOT NULL,
	`periode` text DEFAULT 'bulanan' NOT NULL,
	`is_aktif` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jenis_tagihan_nama_unique` ON `jenis_tagihan` (`nama`);--> statement-breakpoint
CREATE TABLE `kelas` (
	`id` text PRIMARY KEY DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`nama` text NOT NULL,
	`tingkat` text NOT NULL,
	`wali_kelas` text,
	`tahun_ajaran_id` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `kwitansi_counter` (
	`tahun_ajaran_id` text PRIMARY KEY NOT NULL,
	`last_number` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pembayaran` (
	`id` text PRIMARY KEY DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`tagihan_id` text NOT NULL,
	`tanggal` text DEFAULT 'CURRENT_DATE' NOT NULL,
	`jumlah` real NOT NULL,
	`metode` text DEFAULT 'tunai' NOT NULL,
	`referencia` text,
	`catatan` text,
	`bukti_url` text,
	`nomor_kwitansi` text,
	`dicatat_oleh` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`tagihan_id`) REFERENCES `tagihan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`full_name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_username_unique` ON `profiles` (`username`);--> statement-breakpoint
CREATE TABLE `riwayat_kelas` (
	`id` text PRIMARY KEY DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`santri_id` text NOT NULL,
	`kelas_id` text,
	`tahun_ajaran_id` text,
	`kelas_nama` text,
	`tahun_ajaran_nama` text,
	`jenis` text NOT NULL,
	`catatan` text,
	`dicatat_oleh` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`kelas_id`) REFERENCES `kelas`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`dicatat_oleh`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `santri` (
	`id` text PRIMARY KEY DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`nis` text NOT NULL,
	`nama_lengkap` text NOT NULL,
	`jenis_kelamin` text NOT NULL,
	`tanggal_lahir` text,
	`tempat_lahir` text,
	`alamat` text,
	`nama_ayah` text NOT NULL,
	`no_wa_ayah` text NOT NULL,
	`nama_ibu` text,
	`no_wa_ibu` text,
	`kelas_id` text,
	`tahun_masuk` integer NOT NULL,
	`status` text DEFAULT 'aktif' NOT NULL,
	`foto_url` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`kelas_id`) REFERENCES `kelas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `santri_nis_unique` ON `santri` (`nis`);--> statement-breakpoint
CREATE TABLE `tagihan` (
	`id` text PRIMARY KEY DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`santri_id` text NOT NULL,
	`jenis_tagihan_id` text NOT NULL,
	`tahun_ajaran_id` text NOT NULL,
	`periode_label` text NOT NULL,
	`jatuh_tempo` text,
	`nominal` real DEFAULT 0 NOT NULL,
	`terbayar` real DEFAULT 0 NOT NULL,
	`sisa` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'belum_bayar' NOT NULL,
	`catatan` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`jenis_tagihan_id`) REFERENCES `jenis_tagihan`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`tahun_ajaran_id`) REFERENCES `tahun_ajaran`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `tahun_ajaran` (
	`id` text PRIMARY KEY DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`nama` text NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`tanggal_selesai` text NOT NULL,
	`is_aktif` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tahun_ajaran_nama_unique` ON `tahun_ajaran` (`nama`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `whatsapp_logs` (
	`id` text PRIMARY KEY DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`tagihan_id` text,
	`santri_id` text,
	`nomor_tujuan` text NOT NULL,
	`pesan` text NOT NULL,
	`status` text NOT NULL,
	`keterangan` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`created_by` text,
	FOREIGN KEY (`tagihan_id`) REFERENCES `tagihan`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`santri_id`) REFERENCES `santri`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null
);
