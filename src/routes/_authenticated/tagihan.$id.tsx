import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Send, Printer, Pencil } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { usePembayaran, useCreatePembayaran } from "@/hooks/api";
import { rupiah, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/_authenticated/tagihan/$id")({
  head: () => ({ meta: [{ title: "Detail Tagihan — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: TagihanDetailPage,
});

type StatusTagihan = "belum_bayar" | "sebagian" | "lunas" | "batal";
type Metode = "tunai" | "transfer" | "qris" | "lainnya";

const statusBadge: Record<StatusTagihan, { label: string; cls: string }> = {
  belum_bayar: { label: "Belum Bayar", cls: "bg-destructive/15 text-destructive" },
  sebagian: { label: "Sebagian", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  lunas: { label: "Lunas", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  batal: { label: "Batal", cls: "bg-muted text-muted-foreground" },
};

const paySchema = z.object({
  tanggal: z.string().min(1, "Wajib"),
  jumlah: z.coerce.number().positive("Harus > 0"),
  metode: z.enum(["tunai", "transfer", "qris", "lainnya"]),
  referensi: z.string().max(80).optional().or(z.literal("")),
  catatan: z.string().max(300).optional().or(z.literal("")),
});
type PayForm = z.infer<typeof paySchema>;

function TagihanDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const canWrite = profile?.role === "admin" || profile?.role === "bendahara";
  const [payOpen, setPayOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: tagihan, isLoading } = useQuery({
    queryKey: ["tagihan_detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/tagihan/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch tagihan');
      const data = await res.json();
      return data.tagihan;
    },
  });

  const createPembayaran = useCreatePembayaran();

  const form = useForm<PayForm>({
    resolver: zodResolver(paySchema),
    defaultValues: { tanggal: new Date().toISOString().slice(0, 10), jumlah: 0, metode: "tunai", referensi: "", catatan: "" },
  });

  const openPay = () => {
    form.reset({
      tanggal: new Date().toISOString().slice(0, 10),
      jumlah: Number(tagihan?.sisa ?? 0),
      metode: "tunai",
      referensi: "",
      catatan: "",
    });
    setPayOpen(true);
  };

  const addPay = useMutation({
    mutationFn: async (v: PayForm) => {
      return createPembayaran.mutateAsync({
        tagihanId: id,
        tanggal: v.tanggal,
        jumlah: v.jumlah,
        metode: v.metode,
        referensi: v.referensi || undefined,
        catatan: v.catatan || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Pembayaran dicatat");
      setPayOpen(false);
      qc.invalidateQueries({ queryKey: ["tagihan_detail", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Memuat…</div>;
  if (!tagihan) return <div className="p-6 text-muted-foreground">Tagihan tidak ditemukan.</div>;

  const hasWaWali = !!tagihan.noWaAyah;
  const status = tagihan.status as StatusTagihan;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/tagihan"><ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke daftar</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{tagihan.jenisTagihanNama} — {tagihan.periodeLabel}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Tahun Ajaran {tagihan.tahunAjaranNama}</p>
            </div>
            <Badge className={statusBadge[status]?.cls || ""}>{statusBadge[status]?.label || status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Santri</p>
            <p className="font-medium">{tagihan.studentNama || "-"}</p>
            <p className="text-xs text-muted-foreground">NIS {tagihan.studentNis || "-"} · {tagihan.kelasNama || "Tanpa kelas"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Wali: {tagihan.noWaAyah || "—"} {hasWaWali ? ` (${tagihan.noWaAyah})` : " — no WA"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Jatuh Tempo</p>
            <p>{tagihan.jatuhTempo ? formatDate(tagihan.jatuhTempo) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Nominal</p>
            <p className="font-mono">{rupiah(tagihan.nominal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Terbayar / Sisa</p>
            <p className="font-mono">
              <span className="text-emerald-600 dark:text-emerald-400">{rupiah(tagihan.terbayar)}</span>
              {" / "}
              <span className="text-destructive">{rupiah(tagihan.sisa)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Riwayat Pembayaran</h2>
        <div className="flex gap-2">
          {canWrite && status !== "batal" && Number(tagihan.sisa) > 0 && (
            <Button size="sm" onClick={openPay}><Plus className="h-4 w-4 mr-2" /> Catat Pembayaran</Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Referensi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!tagihan.pembayaran || tagihan.pembayaran.length === 0) ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada pembayaran</TableCell></TableRow>
                ) : tagihan.pembayaran.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.tanggal)}</TableCell>
                    <TableCell className="font-mono text-right">{rupiah(Number(p.jumlah))}</TableCell>
                    <TableCell className="capitalize">{p.metode}</TableCell>
                    <TableCell>{p.referencia || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Link to="/kwitansi/$id" params={{ id: p.id }}>
                        <Button size="icon" variant="ghost"><Printer className="h-4 w-4" /></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Pembayaran</DialogTitle>
            <DialogDescription>Sisa saat ini: <span className="font-mono">{rupiah(Number(tagihan.sisa))}</span></DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => addPay.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" {...form.register("tanggal")} />
                {form.formState.errors.tanggal && <p className="text-xs text-destructive">{form.formState.errors.tanggal.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Metode</Label>
                <Select value={form.watch("metode")} onValueChange={(v) => form.setValue("metode", v as Metode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tunai">Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Jumlah (Rp)</Label>
              <Input type="number" step="1000" {...form.register("jumlah")} />
              {form.formState.errors.jumlah && <p className="text-xs text-destructive">{form.formState.errors.jumlah.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Referensi (opsional)</Label>
              <Input placeholder="No. transaksi / bukti" {...form.register("referensi")} />
            </div>
            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Textarea rows={2} {...form.register("catatan")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Batal</Button>
              <Button type="submit" disabled={addPay.isPending}>{addPay.isPending ? "Menyimpan…" : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pembayaran?</AlertDialogTitle>
            <AlertDialogDescription>Pembayaran akan dihapus permanen.</AlertDialogDescription>
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
