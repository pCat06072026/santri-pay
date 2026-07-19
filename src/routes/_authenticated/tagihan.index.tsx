import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Eye, Wand2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useTagihan, useCreateTagihan, useTahunAjaran } from "@/hooks/api";
import { rupiah, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_authenticated/tagihan/")({
  head: () => ({ meta: [{ title: "Tagihan — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: TagihanPage,
});

type StatusTagihan = "belum_bayar" | "sebagian" | "lunas" | "batal";

const statusBadge: Record<StatusTagihan, { label: string; cls: string }> = {
  belum_bayar: { label: "Belum Bayar", cls: "bg-destructive/15 text-destructive" },
  sebagian: { label: "Sebagian", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  lunas: { label: "Lunas", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  batal: { label: "Batal", cls: "bg-muted text-muted-foreground" },
};

const genSchema = z.object({
  tahunAjaranId: z.string().min(1, "Pilih tahun ajaran"),
  jenisTagihanId: z.string().min(1, "Pilih jenis tagihan"),
  periodeLabel: z.string().trim().min(1, "Wajib diisi").max(60),
  jatuhTempo: z.string().optional().or(z.literal("")),
  nominal: z.coerce.number().min(0),
});
type GenForm = z.infer<typeof genSchema>;

function TagihanPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const canWrite = profile?.role === "admin" || profile?.role === "bendahara";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tahunFilter, setTahunFilter] = useState<string>("all");
  const [genOpen, setGenOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: tagihanData, isLoading } = useTagihan({
    tahunAjaranId: tahunFilter !== "all" ? tahunFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: tahunList = [] } = useTahunAjaran();

  const createTagihan = useCreateTagihan();

  const filtered = useMemo(() => {
    if (!search.trim()) return tagihanData?.tagihan || [];
    const q = search.trim().toLowerCase();
    return (tagihanData?.tagihan || []).filter(
      (t) =>
        t.studentNama?.toLowerCase().includes(q) ||
        t.studentNis?.toLowerCase().includes(q) ||
        t.jenisTagihanNama?.toLowerCase().includes(q)
    );
  }, [tagihanData, search]);

  const stats = tagihanData?.stats || { total: 0, lunas: 0, belum: 0, sebagian: 0 };

  const form = useForm<GenForm>({
    resolver: zodResolver(genSchema),
    defaultValues: {
      tahunAjaranId: "",
      jenisTagihanId: "",
      periodeLabel: "",
      jatuhTempo: "",
      nominal: 0,
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Ringkasan: {stats.total} tagihan · {stats.lunas} lunas · {stats.belum} belum · {stats.sebagian} sebagian
        </p>
        {canWrite && (
          <Button size="sm" onClick={() => setGenOpen(true)}>
            <Wand2 className="h-4 w-4 mr-2" /> Generate Tagihan
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama, NIS, atau jenis tagihan…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
            <SelectItem value="sebagian">Sebagian</SelectItem>
            <SelectItem value="lunas">Lunas</SelectItem>
            <SelectItem value="batal">Batal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Santri</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="text-right">Terbayar</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{r.studentNama || "-"}</p>
                        <p className="text-xs text-muted-foreground">{r.studentNis || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>{r.jenisTagihanNama || "-"}</TableCell>
                    <TableCell>{r.periodeLabel}</TableCell>
                    <TableCell className="text-right">{rupiah(r.nominal)}</TableCell>
                    <TableCell className="text-right">{rupiah(r.terbayar)}</TableCell>
                    <TableCell className="text-right">{rupiah(r.sisa)}</TableCell>
                    <TableCell>
                      <Badge className={statusBadge[r.status]?.cls || ""}>
                        {statusBadge[r.status]?.label || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to="/tagihan/$id" params={{ id: r.id }}>
                        <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Dialog Generate Tagihan ─── */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Tagihan Massal</DialogTitle>
            <DialogDescription>
              Fitur generate tagihan massal akan segera hadir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
