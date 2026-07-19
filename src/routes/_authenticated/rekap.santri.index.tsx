import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight, GraduationCap } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/rekap/santri/")({
  head: () => ({ meta: [{ title: "Rekap Santri — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: RekapSantriPage,
});

type Row = {
  id: string;
  nis: string;
  nama_lengkap: string;
  kelas_id: string | null;
  status: "aktif" | "lulus" | "keluar" | "pindah";
  kelas?: { nama: string; tingkat: string } | null;
};

const statusColor: Record<string, string> = {
  aktif: "bg-[color:var(--success)]/15 text-[color:var(--success)]",
  lulus: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  keluar: "bg-destructive/15 text-destructive",
  pindah: "bg-muted text-muted-foreground",
};

function RekapSantriPage() {
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["rekap_santri_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("santri")
        .select("id, nis, nama_lengkap, status, kelas_id, kelas(nama, tingkat)")
        .order("nama_lengkap");
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const { data: kelasOpts = [] } = useQuery({
    queryKey: ["kelas", "opts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kelas").select("id,nama,tingkat").order("tingkat");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (filterKelas !== "all" && r.kelas_id !== filterKelas) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (!q) return true;
      return (
        r.nama_lengkap.toLowerCase().includes(q) ||
        r.nis.toLowerCase().includes(q)
      );
    });
  }, [data, search, filterKelas, filterStatus]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rekap Santri</h1>
          <p className="text-sm text-muted-foreground">Pilih santri untuk melihat riwayat kelas, tagihan, dan pembayaran.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari NIS atau nama santri..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterKelas} onValueChange={setFilterKelas}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {kelasOpts.map((k) => <SelectItem key={k.id} value={k.id}>{k.tingkat} {k.nama}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="lulus">Lulus</SelectItem>
            <SelectItem value="keluar">Keluar</SelectItem>
            <SelectItem value="pindah">Pindah</SelectItem>
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
                  <TableHead>Nama Santri</TableHead>
                  <TableHead>Kelas Saat Ini</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat data santri…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada data santri ditemukan.</TableCell></TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-accent/50">
                    <TableCell className="font-mono text-xs">{r.nis}</TableCell>
                    <TableCell className="font-medium">{r.nama_lengkap}</TableCell>
                    <TableCell>
                      {r.kelas ? (
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span>{r.kelas.tingkat} {r.kelas.nama}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-normal capitalize ${statusColor[r.status] || ""}`}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/rekap/santri/$id" params={{ id: r.id }}>
                          Detail <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
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
