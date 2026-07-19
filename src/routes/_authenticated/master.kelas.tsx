import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, ArrowUpCircle, GraduationCap } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useKelas, useCreateKelas, useTahunAjaran } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/master/kelas")({
  head: () => ({ meta: [{ title: "Kelas — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: KelasPage,
});

const schema = z.object({
  nama: z.string().trim().min(1, "Wajib").max(50),
  tingkat: z.string().trim().min(1, "Wajib").max(20),
  waliKelas: z.string().trim().max(100).optional().or(z.literal("")),
  tahunAjaranId: z.string().min(1, "Pilih tahun ajaran"),
});
type FormValues = z.infer<typeof schema>;

type Row = {
  id: string;
  nama: string;
  tingkat: string;
  waliKelas: string | null;
  tahunAjaranId: string;
  tahunAjaranNama?: string;
  studentCount: number;
};

function KelasPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleteRow, setDeleteRow] = useState<Row | null>(null);

  const { data: kelasData = [], isLoading } = useKelas();
  const { data: tahunData = [] } = useTahunAjaran();
  const createKelas = useCreateKelas();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nama: "", tingkat: "", waliKelas: "", tahunAjaranId: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ nama: "", tingkat: "", waliKelas: "", tahunAjaranId: "" });
    setDialogOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    form.reset({
      nama: row.nama,
      tingkat: row.tingkat,
      waliKelas: row.waliKelas ?? "",
      tahunAjaranId: row.tahunAjaranId,
    });
    setDialogOpen(true);
  };

  const upsert = useMutation({
    mutationFn: async (v: FormValues) => {
      const payload = {
        nama: v.nama,
        tingkat: v.tingkat,
        waliKelas: v.waliKelas || null,
        tahunAjaranId: v.tahunAjaranId,
      };

      if (editing) {
        // For update, we'd need an updateKelas mutation
        // For now, create only
        toast.error("Update kelas belum tersedia");
        return;
      } else {
        return createKelas.mutateAsync(payload);
      }
    },
    onSuccess: () => {
      toast.success("Kelas ditambahkan");
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Kelola daftar kelas di pondok.</p>
        {isAdmin && <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" /> Tambah Kelas</Button>}
      </div>

      {/* Info fitur massal */}
      {isAdmin && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-primary">Operasi Massal</CardTitle>
            <CardDescription className="text-xs">
              Naik kelas dan luluskan massal dapat dilakukan melalui halaman Santri.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead>Wali Kelas</TableHead>
                  <TableHead>Tahun Ajaran</TableHead>
                  <TableHead>Jumlah Santri</TableHead>
                  {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Memuat…</TableCell></TableRow>
                ) : kelasData.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow>
                ) : kelasData.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nama}</TableCell>
                    <TableCell><Badge variant="outline">{r.tingkat}</Badge></TableCell>
                    <TableCell>{r.waliKelas ?? "-"}</TableCell>
                    <TableCell>{r.tahunAjaranNama ?? "-"}</TableCell>
                    <TableCell>{r.studentCount}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteRow(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Dialog CRUD Kelas ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kelas" : "Tambah Kelas"}</DialogTitle>
            <DialogDescription>Data kelas dan wali kelas.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => upsert.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nama Kelas</Label>
                <Input {...form.register("nama")} placeholder="7A" />
                {form.formState.errors.nama && <p className="text-xs text-destructive">{form.formState.errors.nama.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tingkat</Label>
                <Input {...form.register("tingkat")} placeholder="7" />
                {form.formState.errors.tingkat && <p className="text-xs text-destructive">{form.formState.errors.tingkat.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Wali Kelas (opsional)</Label>
              <Input {...form.register("waliKelas")} placeholder="Ustadz ..." />
            </div>
            <div className="space-y-2">
              <Label>Tahun Ajaran</Label>
              <Select
                value={form.watch("tahunAjaranId")}
                onValueChange={(v) => form.setValue("tahunAjaranId", v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
                <SelectContent>
                  {tahunData.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nama}{t.isAktif ? " (aktif)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.tahunAjaranId && (
                <p className="text-xs text-destructive">{form.formState.errors.tahunAjaranId.message}</p>
              )}
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
            <AlertDialogTitle>Hapus kelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Kelas <strong>{deleteRow?.nama}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRow && toast.info("Fitur hapus belum tersedia")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
