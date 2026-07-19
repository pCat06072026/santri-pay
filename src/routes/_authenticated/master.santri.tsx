import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search, Download, Upload, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { exportToExcel } from "@/lib/export";
import { parseExcel } from "@/lib/import";
import { useAuth } from "@/hooks/use-auth";
import { useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent, useKelas } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/master/santri")({
  head: () => ({ meta: [{ title: "Santri — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: SantriPage,
});

const phoneRegex = /^[0-9+]{8,20}$/;

const schema = z.object({
  nis: z.string().trim().min(3, "Minimal 3 karakter").max(30),
  namaLengkap: z.string().trim().min(2).max(150),
  jenisKelamin: z.enum(["L", "P"]),
  tempatLahir: z.string().trim().max(100).optional().or(z.literal("")),
  tanggalLahir: z.string().optional().or(z.literal("")),
  alamat: z.string().trim().max(500).optional().or(z.literal("")),
  namaAyah: z.string().trim().min(2, "Wajib diisi").max(150),
  noWaAyah: z.string().trim().regex(phoneRegex, "Nomor tidak valid (8–20 digit)"),
  namaIbu: z.string().trim().optional().or(z.literal("")),
  noWaIbu: z.string().trim().optional().or(z.literal("")),
  kelasId: z.string().optional().or(z.literal("")),
  tahunMasuk: z.coerce.number().int().min(2000).max(2100),
  status: z.enum(["aktif", "lulus", "keluar", "pindah", "calon"]),
});
type FormValues = z.infer<typeof schema>;

type Row = {
  id: string;
  nis: string;
  namaLengkap: string;
  jenisKelamin: "L" | "P";
  tempatLahir: string | null;
  tanggalLahir: string | null;
  alamat: string | null;
  namaAyah: string;
  noWaAyah: string;
  namaIbu: string | null;
  noWaIbu: string | null;
  kelasId: string | null;
  kelasNama?: string;
  tahunMasuk: number;
  status: "aktif" | "lulus" | "keluar" | "pindah" | "calon";
};

const statusColor: Record<string, string> = {
  aktif: "bg-[color:var(--success)]/15 text-[color:var(--success)]",
  lulus: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  keluar: "bg-destructive/15 text-destructive",
  pindah: "bg-muted text-muted-foreground",
  calon: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

function SantriPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleteRow, setDeleteRow] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // Use new API hooks
  const { data: studentData, isLoading } = useStudents({
    status: filterStatus !== "all" ? filterStatus : undefined,
    kelasId: filterKelas !== "all" ? filterKelas : undefined,
    search: search || undefined,
  });

  const { data: kelasData = [] } = useKelas();

  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();

  const data = studentData?.students || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (filterKelas !== "all" && r.kelasId !== filterKelas) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (!q) return true;
      return (
        r.namaLengkap.toLowerCase().includes(q) ||
        r.nis.toLowerCase().includes(q) ||
        r.namaAyah?.toLowerCase().includes(q)
      );
    });
  }, [data, search, filterKelas, filterStatus]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nis: "",
      namaLengkap: "",
      jenisKelamin: "L",
      tempatLahir: "",
      tanggalLahir: "",
      alamat: "",
      namaAyah: "",
      noWaAyah: "",
      namaIbu: "",
      noWaIbu: "",
      kelasId: "",
      tahunMasuk: new Date().getFullYear(),
      status: "aktif",
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      nis: "",
      namaLengkap: "",
      jenisKelamin: "L",
      tempatLahir: "",
      tanggalLahir: "",
      alamat: "",
      namaAyah: "",
      noWaAyah: "",
      namaIbu: "",
      noWaIbu: "",
      kelasId: "",
      tahunMasuk: new Date().getFullYear(),
      status: "aktif",
    });
    setDialogOpen(true);
  };

  const openEdit = (r: Row) => {
    setEditing(r);
    form.reset({
      nis: r.nis,
      namaLengkap: r.namaLengkap,
      jenisKelamin: r.jenisKelamin,
      tempatLahir: r.tempatLahir ?? "",
      tanggalLahir: r.tanggalLahir ?? "",
      alamat: r.alamat ?? "",
      namaAyah: r.namaAyah,
      noWaAyah: r.noWaAyah,
      namaIbu: r.namaIbu ?? "",
      noWaIbu: r.noWaIbu ?? "",
      kelasId: r.kelasId ?? "",
      tahunMasuk: r.tahunMasuk,
      status: r.status,
    });
    setDialogOpen(true);
  };

  const upsert = useMutation({
    mutationFn: async (v: FormValues) => {
      const payload = {
        nis: v.nis,
        namaLengkap: v.namaLengkap,
        jenisKelamin: v.jenisKelamin,
        tempatLahir: v.tempatLahir || null,
        tanggalLahir: v.tanggalLahir || null,
        alamat: v.alamat || null,
        namaAyah: v.namaAyah,
        noWaAyah: v.noWaAyah,
        namaIbu: v.namaIbu || null,
        noWaIbu: v.noWaIbu || null,
        kelasId: v.kelasId || null,
        tahunMasuk: v.tahunMasuk,
        status: v.status,
      };

      if (editing) {
        return updateStudent.mutateAsync({ id: editing.id, data: payload });
      } else {
        return createStudent.mutateAsync(payload);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Santri diperbarui" : "Santri ditambahkan");
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      return deleteStudent.mutateAsync(id);
    },
    onSuccess: () => {
      toast.success("Santri dihapus");
      setDeleteRow(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleExport = () => {
    const exportData = filtered.map(r => ({
      "NIS": r.nis,
      "Nama Lengkap": r.namaLengkap,
      "L/P": r.jenisKelamin,
      "Tempat Lahir": r.tempatLahir || "",
      "Tanggal Lahir": r.tanggalLahir || "",
      "Kelas": r.kelasNama || "",
      "Tahun Masuk": r.tahunMasuk,
      "Status": r.status,
      "Nama Ayah": r.namaAyah,
      "No. WA Ayah": r.noWaAyah,
      "Nama Ibu": r.namaIbu || "",
      "No. WA Ibu": r.noWaIbu || "",
      "Alamat": r.alamat || "",
    }));
    exportToExcel(exportData, "Data_Santri");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseExcel<any>(file);
      if (!data || data.length === 0) {
        toast.error("File excel kosong");
        return;
      }

      const mapped = data.map((row: any) => ({
        nis: String(row["NIS"] || "").trim(),
        namaLengkap: String(row["Nama Lengkap"] || "").trim(),
        jenisKelamin: String(row["L/P"] || "").toUpperCase() === "P" ? "P" : "L",
        tempatLahir: row["Tempat Lahir"] || null,
        tanggalLahir: row["Tanggal Lahir"] ? String(row["Tanggal Lahir"]) : null,
        namaAyah: String(row["Nama Ayah"] || row["Nama Wali"] || "").trim(),
        noWaAyah: String(row["No. WA Ayah"] || row["No. WA Wali"] || "").trim(),
        namaIbu: row["Nama Ibu"] || null,
        noWaIbu: row["No. WA Ibu"] || null,
        tahunMasuk: Number(row["Tahun Masuk"]) || new Date().getFullYear(),
        status: row["Status"] ? String(row["Status"]).toLowerCase() : "aktif",
        alamat: row["Alamat"] || null,
        _original: row,
      }));

      // Validate
      const withErrors = mapped.map(r => {
        const errors = [];
        if (!r.nis) errors.push("NIS kosong");
        else if (r.nis.length < 3) errors.push("NIS min 3 char");

        if (!r.namaLengkap) errors.push("Nama kosong");
        if (!r.namaAyah) errors.push("Ayah kosong");

        if (!r.noWaAyah || !phoneRegex.test(r.noWaAyah)) {
          errors.push("WA Ayah tidak valid");
        }

        // Check duplicate NIS
        if (r.nis && filtered.some(existing => existing.nis === r.nis)) {
          errors.push("NIS sudah ada");
        }

        return { ...r, errors };
      });

      setImportPreview(withErrors);
    } catch (err: any) {
      toast.error("Gagal membaca file: " + err.message);
    }
    e.target.value = ""; // reset
  };

  const confirmImport = async () => {
    const validRows = importPreview.filter(r => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error("Tidak ada data valid untuk diimpor");
      return;
    }

    setImporting(true);
    try {
      for (const r of validRows) {
        const { _original, errors, ...data } = r;
        await createStudent.mutateAsync(data);
      }

      toast.success(`${validRows.length} santri berhasil diimpor`);
      setImportDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const errors = form.formState.errors;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Data santri pondok pesantren.</p>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => { setImportPreview([]); setImportDialogOpen(true); }}>
              <Upload className="h-4 w-4 mr-2" /> Import Excel
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export Excel
          </Button>
          {isAdmin && <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" /> Tambah Santri</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari NIS, nama, atau wali…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterKelas} onValueChange={setFilterKelas}>
          <SelectTrigger><SelectValue placeholder="Filter kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kelas</SelectItem>
            {kelasData.map((k) => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="lulus">Lulus</SelectItem>
            <SelectItem value="keluar">Keluar</SelectItem>
            <SelectItem value="pindah">Pindah</SelectItem>
            <SelectItem value="calon">Calon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIS</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>JK</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Nama Wali</TableHead>
                  <TableHead>WA Wali</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Memuat…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.nis}</TableCell>
                    <TableCell className="font-medium">{r.namaLengkap}</TableCell>
                    <TableCell>{r.jenisKelamin === "L" ? "L" : "P"}</TableCell>
                    <TableCell>{r.kelasNama ?? "-"}</TableCell>
                    <TableCell>{r.namaAyah}</TableCell>
                    <TableCell className="font-mono text-xs">{r.noWaAyah}</TableCell>
                    <TableCell><Badge className={statusColor[r.status]}>{r.status}</Badge></TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteRow(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Dialog Import Excel ─── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Data Santri</DialogTitle>
            <DialogDescription>
              Upload file Excel (.xlsx). Pastikan kolom sesuai format:
              <span className="font-mono bg-muted px-1 py-0.5 rounded ml-1">NIS</span>,
              <span className="font-mono bg-muted px-1 py-0.5 rounded ml-1">Nama Lengkap</span>, dsb.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
              <Input type="file" accept=".xlsx,.xls" onChange={handleImportFile} disabled={importing} />
            </div>

            {importPreview.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>NIS</TableHead>
                      <TableHead>Nama Lengkap</TableHead>
                      <TableHead>L/P</TableHead>
                      <TableHead>Nama Ayah</TableHead>
                      <TableHead>WA Ayah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {row.errors.length > 0 ? (
                            <div className="flex items-center text-destructive text-xs" title={row.errors.join(", ")}>
                              <AlertCircle className="w-4 h-4 mr-1" /> Error
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-transparent">Valid</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.nis}</TableCell>
                        <TableCell className="font-medium text-xs">{row.namaLengkap}</TableCell>
                        <TableCell className="text-xs">{row.jenisKelamin}</TableCell>
                        <TableCell className="text-xs">{row.namaAyah}</TableCell>
                        <TableCell className="font-mono text-xs">{row.noWaAyah}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportPreview([]); setImportDialogOpen(false); }} disabled={importing}>Batal</Button>
            <Button onClick={confirmImport} disabled={importing || importPreview.length === 0 || importPreview.every(r => r.errors.length > 0)}>
              {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Data Valid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Tambah / Edit ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Santri" : "Tambah Santri"}</DialogTitle>
            <DialogDescription>Lengkapi data santri.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => upsert.mutate(v))} className="space-y-4">

            {/* Identitas */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identitas Santri</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>NIS</Label>
                <Input {...form.register("nis")} />
                {errors.nis && <p className="text-xs text-destructive">{errors.nis.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input {...form.register("namaLengkap")} />
                {errors.namaLengkap && <p className="text-xs text-destructive">{errors.namaLengkap.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Jenis Kelamin</Label>
                <Select value={form.watch("jenisKelamin")} onValueChange={(v) => form.setValue("jenisKelamin", v as "L" | "P")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tahun Masuk</Label>
                <Input type="number" {...form.register("tahunMasuk")} />
                {errors.tahunMasuk && <p className="text-xs text-destructive">{errors.tahunMasuk.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tempat Lahir</Label>
                <Input {...form.register("tempatLahir")} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Lahir</Label>
                <Input type="date" {...form.register("tanggalLahir")} />
              </div>
              <div className="space-y-2">
                <Label>Kelas</Label>
                <Select value={form.watch("kelasId") || "none"} onValueChange={(v) => form.setValue("kelasId", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belum ada</SelectItem>
                    {kelasData.map((k) => <SelectItem key={k.id} value={k.id}>{k.tingkat} — {k.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as FormValues["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="lulus">Lulus</SelectItem>
                    <SelectItem value="keluar">Keluar</SelectItem>
                    <SelectItem value="pindah">Pindah</SelectItem>
                    <SelectItem value="calon">Calon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Textarea rows={2} {...form.register("alamat")} />
            </div>

            {/* Data Ayah */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2 border-t">Data Ayah</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nama Ayah <span className="text-destructive">*</span></Label>
                <Input {...form.register("namaAyah")} placeholder="Nama lengkap ayah" />
                {errors.namaAyah && <p className="text-xs text-destructive">{errors.namaAyah.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>No. WA Ayah <span className="text-destructive">*</span></Label>
                <Input {...form.register("noWaAyah")} placeholder="628123456789" />
                {errors.noWaAyah && <p className="text-xs text-destructive">{errors.noWaAyah.message}</p>}
              </div>
            </div>

            {/* Data Ibu */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2 border-t">Data Ibu (Opsional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nama Ibu</Label>
                <Input {...form.register("namaIbu")} placeholder="Nama lengkap ibu" />
              </div>
              <div className="space-y-2">
                <Label>No. WA Ibu</Label>
                <Input {...form.register("noWaIbu")} placeholder="628123456789" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Menyimpan…" : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Hapus ─── */}
      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus santri?</AlertDialogTitle>
            <AlertDialogDescription>Data <strong>{deleteRow?.namaLengkap}</strong> akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRow && remove.mutate(deleteRow.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
