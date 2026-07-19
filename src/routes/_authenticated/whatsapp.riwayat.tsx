import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CheckCircle2, XCircle, Search } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/whatsapp/riwayat")({
  head: () => ({ meta: [{ title: "Riwayat Pesan WA — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: RiwayatWAPage,
});

type Row = {
  id: string;
  nomor_tujuan: string;
  pesan: string;
  status: "terkirim" | "gagal";
  keterangan: string | null;
  created_at: string;
  santri: { nama_lengkap: string; nis: string } | null;
};

function RiwayatWAPage() {
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["whatsapp_logs", search],
    queryFn: async () => {
      let q = supabase
        .from("whatsapp_logs")
        .select("id,nomor_tujuan,pesan,status,keterangan,created_at,santri:santri_id(nama_lengkap,nis)")
        .order("created_at", { ascending: false })
        .limit(500);

      if (search) {
        // Simple search on nomor_tujuan or pesan
        q = q.or(`nomor_tujuan.ilike.%${search}%,pesan.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riwayat Pesan WhatsApp</h1>
          <p className="text-sm text-muted-foreground">500 riwayat pengiriman terakhir dari semua modul.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor atau pesan..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Tanggal & Waktu</TableHead>
                  <TableHead className="w-[180px]">Nomor Tujuan</TableHead>
                  <TableHead className="w-[180px]">Nama Santri</TableHead>
                  <TableHead className="min-w-[300px]">Pesan</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat riwayat...</TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada riwayat pesan.</TableCell></TableRow>
                ) : logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: localeId })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.nomor_tujuan}</TableCell>
                    <TableCell>
                      {log.santri ? (
                        <div className="text-sm">
                          <div className="font-medium">{log.santri.nama_lengkap}</div>
                          <div className="text-xs text-muted-foreground font-mono">{log.santri.nis}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="line-clamp-2 hover:line-clamp-none cursor-pointer" title={log.pesan}>
                        {log.pesan}
                      </div>
                      {log.status === "gagal" && log.keterangan && (
                        <div className="mt-1 text-destructive font-mono opacity-80">{log.keterangan}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.status === "terkirim" ? (
                        <Badge variant="outline" className="bg-[color:var(--success)]/15 text-[color:var(--success)] font-normal border-transparent">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Terkirim
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/15 text-destructive font-normal border-transparent">
                          <XCircle className="w-3 h-3 mr-1" /> Gagal
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
