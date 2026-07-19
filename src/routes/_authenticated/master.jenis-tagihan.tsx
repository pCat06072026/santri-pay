import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { rupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/master/jenis-tagihan")({
  head: () => ({ meta: [{ title: "Jenis Tagihan — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: JenisTagihanPage,
});

const schema = z.object({
  nama: z.string().trim().min(2).max(80),
  deskripsi: z.string().trim().max(500).optional().or(z.literal("")),
  nominal_default: z.coerce.number().min(0, "Tidak boleh negatif"),
  periode: z.enum(["bulanan", "tahunan", "sekali"]),
  is_aktif: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

type Row = {
  id: string; nama: string; deskripsi: string | null; nominal_default: number;
  periode: "bulanan" | "tahunan" | "sekali"; is_aktif: boolean;
};

const periodeLabel: Record<string, string> = {
  bulanan: "Bulanan", tahunan: "Tahunan", sekali: "Sekali Bayar",
};

function JenisTagihanPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleteRow, setDeleteRow] = useState<Row | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["jenis_tagihan"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jenis_tagihan").select("*").order("nama");
      if (error) throw error;
      return data as Row[];
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nama: "", deskripsi: "", nominal_default: 0, periode: "bulanan", is_aktif: true },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ nama: "", deskripsi: "", nominal_default: 0, periode: "bulanan", is_aktif: true });
    setDialogOpen(true);
  };
  const openEdit = (r: Row) => {
    setEditing(r);
    form.reset({
      nama: r.nama, deskripsi: r.deskripsi ?? "", nominal_default: Number(r.nominal_default),
      periode: r.periode, is_aktif: r.is_aktif,
    });
    setDialogOpen(true);
  };

  const upsert = useMutation({
    mutationFn: async (v: FormValues) => {
      const payload = { ...v, deskripsi: v.deskripsi || null };
      if (editing) {
        const { error } = await supabase.from("jenis_tagihan").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("jenis_tagihan").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Jenis tagihan diperbarui" : "Jenis tagihan ditambahkan");
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["jenis_tagihan"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jenis_tagihan").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Jenis tagihan dihapus"); setDeleteRow(null); qc.invalidateQueries({ queryKey: ["jenis_tagihan"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Kelola jenis tagihan (SPP, kegiatan, dll).</p>
        {isAdmin && <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" /> Tambah</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Nominal Default</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat…</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow>
                ) : data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.nama}
                      {r.deskripsi && <p className="text-xs text-muted-foreground mt-0.5">{r.deskripsi}</p>}
                    </TableCell>
                    <TableCell>{periodeLabel[r.periode]}</TableCell>
                    <TableCell className="font-mono">{rupiah(r.nominal_default)}</TableCell>
                    <TableCell>
                      {r.is_aktif ? (
                        <Badge className="bg-[color:var(--success)]/15 text-[color:var(--success)]">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Nonaktif</Badge>
                      )}
                    </TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Jenis Tagihan" : "Tambah Jenis Tagihan"}</DialogTitle>
            <DialogDescription>Definisikan jenis tagihan dan nominal defaultnya.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => upsert.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input {...form.register("nama")} placeholder="SPP Bulanan" />
              {form.formState.errors.nama && <p className="text-xs text-destructive">{form.formState.errors.nama.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Deskripsi (opsional)</Label>
              <Textarea rows={2} {...form.register("deskripsi")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Periode</Label>
                <Select value={form.watch("periode")} onValueChange={(v) => form.setValue("periode", v as FormValues["periode"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bulanan">Bulanan</SelectItem>
                    <SelectItem value="tahunan">Tahunan</SelectItem>
                    <SelectItem value="sekali">Sekali Bayar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nominal Default (Rp)</Label>
                <Input type="number" step="1000" {...form.register("nominal_default")} />
                {form.formState.errors.nominal_default && <p className="text-xs text-destructive">{form.formState.errors.nominal_default.message}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="text-sm">Aktif</Label>
              <Switch checked={form.watch("is_aktif")} onCheckedChange={(v) => form.setValue("is_aktif", v)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Menyimpan…" : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus jenis tagihan?</AlertDialogTitle>
            <AlertDialogDescription><strong>{deleteRow?.nama}</strong> akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteRow && remove.mutate(deleteRow.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
