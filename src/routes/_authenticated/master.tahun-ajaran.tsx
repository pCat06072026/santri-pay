import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useTahunAjaran, useCreateTahunAjaran } from "@/hooks/api";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

export const Route = createFileRoute("/_authenticated/master/tahun-ajaran")({
  head: () => ({ meta: [{ title: "Tahun Ajaran — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: TahunAjaranPage,
});

const schema = z.object({
  nama: z.string().trim().min(4, "Minimal 4 karakter").max(20),
  tanggalMulai: z.string().min(1, "Wajib"),
  tanggalSelesai: z.string().min(1, "Wajib"),
  isAktif: z.boolean(),
}).refine((v) => new Date(v.tanggalSelesai) > new Date(v.tanggalMulai), {
  message: "Tanggal selesai harus setelah tanggal mulai",
  path: ["tanggalSelesai"],
});
type FormValues = z.infer<typeof schema>;

function TahunAjaranPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<any | null>(null);

  const { data = [], isLoading } = useTahunAjaran();
  const createTahunAjaran = useCreateTahunAjaran();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nama: "", tanggalMulai: "", tanggalSelesai: "", isAktif: false },
  });

  const openCreate = () => {
    form.reset({ nama: "", tanggalMulai: "", tanggalSelesai: "", isAktif: false });
    setDialogOpen(true);
  };

  const submit = useMutation({
    mutationFn: async (v: FormValues) => {
      return createTahunAjaran.mutateAsync({
        nama: v.nama,
        tanggalMulai: v.tanggalMulai,
        tanggalSelesai: v.tanggalSelesai,
        isAktif: v.isAktif,
      });
    },
    onSuccess: () => {
      toast.success("Tahun ajaran ditambahkan");
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["tahunAjaran"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Kelola tahun ajaran.</p>
        {isAdmin && <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" /> Tambah Tahun Ajaran</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Tanggal Selesai</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Memuat…</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow>
              ) : data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nama}</TableCell>
                  <TableCell>{formatDate(r.tanggalMulai)}</TableCell>
                  <TableCell>{formatDate(r.tanggalSelesai)}</TableCell>
                  <TableCell>
                    {r.isAktif ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Aktif</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Tahun Ajaran</DialogTitle>
            <DialogDescription>Data tahun ajaran baru.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input {...form.register("nama")} placeholder="2025/2026" />
              {form.formState.errors.nama && <p className="text-xs text-destructive">{form.formState.errors.nama.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input type="date" {...form.register("tanggalMulai")} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Input type="date" {...form.register("tanggalSelesai")} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch("isAktif")}
                onCheckedChange={(v) => form.setValue("isAktif", v)}
              />
              <Label>Jadikan tahun ajaran aktif</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={submit.isPending}>{submit.isPending ? "Menyimpan…" : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tahun ajaran?</AlertDialogTitle>
            <AlertDialogDescription>Data tahun ajaran akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
