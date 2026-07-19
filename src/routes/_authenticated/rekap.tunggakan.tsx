import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, History, ChevronRight, Download, FileText } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { rupiah } from "@/lib/format";
import { exportToExcel, exportToPDF } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/rekap/tunggakan")({
  head: () => ({ meta: [{ title: "Tunggakan — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: TunggakanPage,
});

type Row = {
  id: string;
  nominal: number;
  terbayar: number;
  sisa: number;
  status: "belum_bayar" | "sebagian" | "lunas" | "batal";
  periode_label: string;
  tahun_ajaran_id: string;
  santri_id: string;
  santri: { nama_lengkap: string; nis: string; kelas: { id: string; nama: string; tingkat: string } | null } | null;
};

function TunggakanPage() {
  const [search, setSearch] = useState("");
  const [tahunFilter, setTahunFilter] = useState("all");
  const [kelasFilter, setKelasFilter] = useState("all");

  const { data: tahunList = [] } = useQuery({
    queryKey: ["tahun_ajaran"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tahun_ajaran").select("id,nama,is_aktif").order("nama", { ascending: false });
      if (error) throw error;
      return data;
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

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["tunggakan_tagihan", tahunFilter, kelasFilter],
    queryFn: async () => {
      let q = supabase
        .from("tagihan")
        .select("id,nominal,terbayar,sisa,status,periode_label,tahun_ajaran_id,santri_id,santri:santri_id(nama_lengkap,nis,kelas:kelas_id(id,nama,tingkat))")
        .in("status", ["belum_bayar", "sebagian"])
        .limit(5000);
      
      if (tahunFilter !== "all") q = q.eq("tahun_ajaran_id", tahunFilter);
      
      const { data, error } = await q;
      if (error) throw error;
      
      let res = data as unknown as Row[];
      if (kelasFilter !== "all") {
        res = res.filter((r) => r.santri?.kelas?.id === kelasFilter);
      }
      return res;
    },
  });

  const tunggakanSantri = useMemo(() => {
    const map = new Map<string, { id: string; nama: string; nis: string; kelas: string; sisa: number; count: number }>();
    for (const r of rows) {
      const s = r.santri;
      if (!s) continue;
      
      const q = search.trim().toLowerCase();
      if (q && !s.nama_lengkap.toLowerCase().includes(q) && !s.nis.toLowerCase().includes(q)) continue;

      const key = s.nis;
      const kelas = s.kelas ? `${s.kelas.tingkat} ${s.kelas.nama}` : "—";
      const cur = map.get(key) ?? { id: r.santri_id, nama: s.nama_lengkap, nis: s.nis, kelas, sisa: 0, count: 0 };
      cur.sisa += Number(r.sisa); 
      cur.count++;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.sisa - a.sisa);
  }, [rows, search]);

  const totalSisa = tunggakanSantri.reduce((acc, curr) => acc + curr.sisa, 0);

  const activeTahun = tahunList.find((t) => t.id === tahunFilter)?.nama || "Semua Tahun Ajaran";
  const activeKelas = kelasOpts.find((k) => k.id === kelasFilter)?.nama || "Semua Kelas";

  const handleExportExcel = () => {
    const data = tunggakanSantri.map(r => ({
      "NIS": r.nis,
      "Nama Lengkap": r.nama,
      "Kelas": r.kelas,
      "Jml Tagihan Tertunggak": r.count,
      "Total Sisa (Rp)": r.sisa,
    }));
    exportToExcel(data, `Data_Tunggakan_${activeTahun}_${activeKelas}`);
  };

  const handleExportPDF = () => {
    const head = [["NIS", "Nama Lengkap", "Kelas", "Jml Tagihan Tertunggak", "Total Sisa"]];
    const body = tunggakanSantri.map(r => [
      r.nis,
      r.nama,
      r.kelas,
      r.count,
      rupiah(r.sisa),
    ]);

    exportToPDF({
      filename: `Data_Tunggakan_${activeTahun}`,
      title: "Laporan Tunggakan Santri Pondok Pesantren",
      subtitle: `Tahun Ajaran: ${activeTahun} | Kelas: ${activeKelas}`,
      head,
      body,
      orientation: "portrait"
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tunggakan Santri</h1>
          <p className="text-sm text-muted-foreground">Daftar santri yang memiliki tagihan belum lunas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={isLoading || tunggakanSantri.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={isLoading || tunggakanSantri.length === 0}>
            <FileText className="w-4 h-4 mr-2 text-destructive" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center bg-muted/30 p-3 rounded-lg border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari NIS atau nama santri..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={tahunFilter} onValueChange={setTahunFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-background"><SelectValue placeholder="Tahun Ajaran" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tahun Ajaran</SelectItem>
            {tahunList.map((t) => <SelectItem key={t.id} value={t.id}>{t.nama}{t.is_aktif ? " (aktif)" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={kelasFilter} onValueChange={setKelasFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-background"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {kelasOpts.map((k) => <SelectItem key={k.id} value={k.id}>{k.tingkat} {k.nama}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <History className="h-4 w-4" />
              Total Keseluruhan Tunggakan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-destructive">{rupiah(totalSisa)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Dari {tunggakanSantri.length} santri yang menunggak
            </p>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIS</TableHead>
                    <TableHead>Nama Santri</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead className="text-right">Jml Tagihan</TableHead>
                    <TableHead className="text-right">Total Sisa</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Memuat data tunggakan…</TableCell></TableRow>
                  ) : tunggakanSantri.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada tunggakan 🎉</TableCell></TableRow>
                  ) : tunggakanSantri.map((r) => (
                    <TableRow key={r.nis}>
                      <TableCell className="font-mono text-xs">{r.nis}</TableCell>
                      <TableCell className="font-medium">{r.nama}</TableCell>
                      <TableCell>{r.kelas}</TableCell>
                      <TableCell className="text-right">{r.count}</TableCell>
                      <TableCell className="font-mono text-right text-destructive font-medium">{rupiah(r.sisa)}</TableCell>
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
    </div>
  );
}
