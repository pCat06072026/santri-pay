/**
 * API Hooks - TanStack Query hooks for API calls
 *
 * These hooks wrap the API routes and provide
 * type-safe data fetching with TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================
// Types
// ============================================================

export interface Student {
  id: string;
  nis: string;
  namaLengkap: string;
  jenisKelamin: string;
  tanggalLahir: string | null;
  tempatLahir: string | null;
  alamat: string | null;
  namaAyah: string;
  noWaAyah: string;
  namaIbu: string | null;
  noWaIbu: string | null;
  kelasId: string | null;
  kelasNama?: string;
  kelasTingkat?: string;
  tahunMasuk: number;
  status: 'aktif' | 'calon' | 'lulus' | 'keluar' | 'pindah';
  fotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentCounts {
  total: number;
  aktif: number;
  lulus: number;
  keluar: number;
}

export interface Kelas {
  id: string;
  nama: string;
  tingkat: string;
  waliKelas: string | null;
  tahunAjaranId: string;
  tahunAjaranNama?: string;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TahunAjaran {
  id: string;
  nama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  isAktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tagihan {
  id: string;
  studentId: string;
  jenisTagihanId: string;
  tahunAjaranId: string;
  periodeLabel: string;
  jatuhTempo: string | null;
  nominal: number;
  terbayar: number;
  sisa: number;
  status: 'belum_bayar' | 'sebagian' | 'lunas' | 'batal';
  catatan: string | null;
  studentNama?: string;
  studentNis?: string;
  kelasNama?: string;
  jenisTagihanNama?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pembayaran {
  id: string;
  tagihanId: string;
  tanggal: string;
  jumlah: number;
  metode: 'tunai' | 'transfer' | 'qris' | 'lainnya';
  referensi: string | null;
  catatan: string | null;
  buktiUrl: string | null;
  nomorKwitansi: string | null;
  studentNama?: string;
  studentNis?: string;
  kelasNama?: string;
  jenisTagihanNama?: string;
  tagihanPeriode?: string;
  createdAt: string;
}

// ============================================================
// Fetch wrapper
// ============================================================

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return res.json();
}

// ============================================================
// Student Hooks
// ============================================================

export function useStudents(filters?: {
  status?: string;
  kelasId?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.kelasId) params.set('kelasId', filters.kelasId);
  if (filters?.search) params.set('search', filters.search);

  return useQuery({
    queryKey: ['students', filters],
    queryFn: () =>
      apiFetch<{ students: Student[]; counts: StudentCounts }>(
        `/api/santri?${params.toString()}`
      ),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiFetch<{ student: Student }>('/api/santri', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Student>;
    }) =>
      apiFetch<{ student: Student }>(`/api/santri/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', id] });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/santri/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

// ============================================================
// Tahun Ajaran Hooks
// ============================================================

export function useTahunAjaran() {
  return useQuery({
    queryKey: ['tahunAjaran'],
    queryFn: () =>
      apiFetch<{ tahunAjaran: TahunAjaran[] }>('/api/tahun-ajaran'),
  });
}

export function useCreateTahunAjaran() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<TahunAjaran, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiFetch<{ tahunAjaran: TahunAjaran }>('/api/tahun-ajaran', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tahunAjaran'] });
    },
  });
}

// ============================================================
// Kelas Hooks
// ============================================================

export function useKelas(tahunAjaranId?: string) {
  const params = tahunAjaranId ? `?tahunAjaranId=${tahunAjaranId}` : '';

  return useQuery({
    queryKey: ['kelas', tahunAjaranId],
    queryFn: () =>
      apiFetch<{ kelas: Kelas[] }>(`/api/kelas${params}`),
  });
}

export function useCreateKelas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Kelas, 'id' | 'createdAt' | 'updatedAt' | 'studentCount'>) =>
      apiFetch<{ kelas: Kelas }>('/api/kelas', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelas'] });
    },
  });
}

// ============================================================
// Tagihan Hooks
// ============================================================

export function useTagihan(filters?: {
  tahunAjaranId?: string;
  studentId?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.tahunAjaranId) params.set('tahunAjaranId', filters.tahunAjaranId);
  if (filters?.studentId) params.set('studentId', filters.studentId);
  if (filters?.status) params.set('status', filters.status);

  return useQuery({
    queryKey: ['tagihan', filters],
    queryFn: () =>
      apiFetch<{ tagihan: Tagihan[]; stats: any }>(
        `/api/tagihan?${params.toString()}`
      ),
  });
}

export function useCreateTagihan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Tagihan, 'id' | 'terbayar' | 'sisa' | 'status' | 'createdAt' | 'updatedAt'>) =>
      apiFetch<{ tagihan: Tagihan }>('/api/tagihan', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tagihan'] });
    },
  });
}

// ============================================================
// Pembayaran Hooks
// ============================================================

export function usePembayaran(limit?: number) {
  const params = limit ? `?limit=${limit}` : '';

  return useQuery({
    queryKey: ['pembayaran', limit],
    queryFn: () =>
      apiFetch<{ pembayaran: Pembayaran[]; monthlyTotal: number }>(
        `/api/pembayaran${params}`
      ),
  });
}

export function useCreatePembayaran() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      tagihanId: string;
      tanggal?: string;
      jumlah: number;
      metode?: string;
      referensi?: string;
      catatan?: string;
      buktiUrl?: string;
    }) =>
      apiFetch<{ pembayaran: Pembayaran }>('/api/pembayaran', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pembayaran'] });
      queryClient.invalidateQueries({ queryKey: ['tagihan'] });
    },
  });
}
