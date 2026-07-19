import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, AlertCircle, Users, Download, FileText } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { rupiah } from "@/lib/format";
import { exportToExcel, exportToPDF } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/laporan")({
  head: () => ({ meta: [{ title: "Laporan — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: LaporanPage,
});

type Row = {
  id: string;
  nominal: number;
  terbayar: number;
  sisa: number;
  status: "belum_bayar" | "sebagian" | "lunas" | "batal";
  periode_label: string;
  tahun_ajaran_id: string;
  santri: { nama_lengkap: string; nis: string; kelas: { id: string; nama: string; tingkat: string } | null } | null;
  jenis_tagihan: { id: string; nama: string } | null;
};

function LaporanPage() {
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
    queryKey: ["laporan_tagihan", tahunFilter, kelasFilter],
    queryFn: async () => {
      let q = supabase
        .from("tagihan")
        .select("id,nominal,terbayar,sisa,status,periode_label,tahun_ajaran_id,santri:santri_id(nama_lengkap,nis,kelas:kelas_id(id,nama,tingkat)),jenis_tagihan:jenis_tagihan_id(id,nama)")
        .neq("status", "batal")
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

  const summary = useMemo(() => {
    let nominal = 0, terbayar = 0, sisa = 0, tunggakan = 0;
    const santriSet = new Set<string>();
    for (const r of rows) {
      nominal += Number(r.nominal);
      terbayar += Number(r.terbayar);
      sisa += Number(r.sisa);
      if (r.status !== "lunas") tunggakan++;
      if (r.santri) santriSet.add(r.santri.nis);
    }
    return { nominal, terbayar, sisa, tunggakan, santri: santriSet.size };
  }, [rows]);

  const perKelas = useMemo(() => {
    const map = new Map<string, { label: string; nominal: number; terbayar: number; sisa: number; count: number }>();
    for (const r of rows) {
      const k = r.santri?.kelas;
      const key = k?.id ?? "none";
      const label = k ? `${k.tingkat} ${k.nama}` : "Tanpa Kelas";
      const cur = map.get(key) ?? { label, nominal: 0, terbayar: 0, sisa: 0, count: 0 };
      cur.nominal += Number(r.nominal); cur.terbayar += Number(r.terbayar); cur.sisa += Number(r.sisa); cur.count++;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.sisa - a.sisa);
  }, [rows]);

  const perJenis = useMemo(() => {
    const map = new Map<string, { label: string; nominal: number; terbayar: number; sisa: number; count: number }>();
    for (const r of rows) {
      const j = r.jenis_tagihan;
      const key = j?.id ?? "none";
      const label = j?.nama ?? "Lainnya";
      const cur = map.get(key) ?? { label, nominal: 0, terbayar: 0, sisa: 0, count: 0 };
      cur.nominal += Number(r.nominal); cur.terbayar += Number(r.terbayar); cur.sisa += Number(r.sisa); cur.count++;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.sisa - a.sisa);
  }, [rows]);

  const activeTahun = tahunList.find((t) => t.id === tahunFilter)?.nama || "Semua Tahun Ajaran";
  const activeKelas = kelasOpts.find((k) => k.id === kelasFilter)?.nama || "Semua Kelas";

  const handleExportExcel = () => {
    const data = perKelas.map(r => ({
      "Kelas": r.label,
      "Jml Tagihan": r.count,
      "Total Nominal (Rp)": r.nominal,
      "Terbayar (Rp)": r.terbayar,
      "Sisa Tunggakan (Rp)": r.sisa,
      "% Lunas": r.nominal > 0 ? Math.round((r.terbayar / r.nominal) * 100) + "%" : "0%"
    }));
    exportToExcel(data, `Laporan_Keuangan_Per_Kelas_${activeTahun}_${activeKelas}`);
  };

  const handleExportPDF = () => {
    const head = [["Kelas", "Jml Tagihan", "Total Nominal", "Terbayar", "Sisa Tunggakan", "% Lunas"]];
    const body = perKelas.map(r => [
      r.label,
      r.count,
      rupiah(r.nominal),
      rupiah(r.terbayar),
      rupiah(r.sisa),
      r.nominal > 0 ? Math.round((r.terbayar / r.nominal) * 100) + "%" : "0%"
    ]);

    exportToPDF({
      filename: `Laporan_Keuangan_${activeTahun}`,
      title: "Laporan Rekapitulasi Keuangan Pondok Pesantren",
      subtitle: `Tahun Ajaran: ${activeTahun} | Kelas: ${activeKelas}`,
      head,
      body,
      orientation: "landscape"
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-muted-foreground">Rekap keuangan berdasarkan seluruh tagihan aktif.</p>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={tahunFilter} onValueChange={setTahunFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Tahun Ajaran" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun Ajaran</SelectItem>
              {tahunList.map((t) => <SelectItem key={t.id} value={t.id}>{t.nama}{t.is_aktif ? " (aktif)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={kelasFilter} onValueChange={setKelasFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {kelasOpts.map((k) => <SelectItem key={k.id} value={k.id}>{k.tingkat} {k.nama}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportExcel} disabled={isLoading || perKelas.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={isLoading || perKelas.length === 0}>
            <FileText className="w-4 h-4 mr-2 text-destructive" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={Wallet} label="Total Tagihan" value={rupiah(summary.nominal)} tone="text-foreground" />
        <SummaryCard icon={TrendingUp} label="Terbayar" value={rupiah(summary.terbayar)} tone="text-emerald-600 dark:text-emerald-400" />
        <SummaryCard icon={AlertCircle} label="Sisa / Tunggakan" value={rupiah(summary.sisa)} tone="text-destructive" />
        <SummaryCard icon={Users} label="Santri Tertagih" value={`${summary.santri}`} sub={`${summary.tunggakan} tagihan belum lunas`} tone="text-primary" />
      </div>

      <Tabs defaultValue="kelas">
        <TabsList>
          <TabsTrigger value="kelas">Per Kelas</TabsTrigger>
          <TabsTrigger value="jenis">Per Jenis Tagihan</TabsTrigger>
        </TabsList>

        <TabsContent value="kelas">
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow>
              <TableHead>Kelas</TableHead>
              <TableHead className="text-right">Tagihan</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead className="text-right">Terbayar</TableHead>
              <TableHead className="text-right">Sisa</TableHead>
              <TableHead className="text-right">% Lunas</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Memuat…</TableCell></TableRow>
              ) : perKelas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow>
              ) : perKelas.map((r) => (
                <TableRow key={r.label}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="font-mono text-right">{rupiah(r.nominal)}</TableCell>
                  <TableCell className="font-mono text-right text-emerald-600 dark:text-emerald-400">{rupiah(r.terbayar)}</TableCell>
                  <TableCell className="font-mono text-right text-destructive">{rupiah(r.sisa)}</TableCell>
                  <TableCell className="text-right">{r.nominal > 0 ? Math.round((r.terbayar / r.nominal) * 100) : 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="jenis">
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow>
              <TableHead>Jenis Tagihan</TableHead>
              <TableHead className="text-right">Tagihan</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead className="text-right">Terbayar</TableHead>
              <TableHead className="text-right">Sisa</TableHead>
              <TableHead className="text-right">% Lunas</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {perJenis.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell></TableRow>
              ) : perJenis.map((r) => (
                <TableRow key={r.label}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="font-mono text-right">{rupiah(r.nominal)}</TableCell>
                  <TableCell className="font-mono text-right text-emerald-600 dark:text-emerald-400">{rupiah(r.terbayar)}</TableCell>
                  <TableCell className="font-mono text-right text-destructive">{rupiah(r.sisa)}</TableCell>
                  <TableCell className="text-right">{r.nominal > 0 ? Math.round((r.terbayar / r.nominal) * 100) : 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; tone: string }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${tone}`} />
      </CardHeader>
      <CardContent>
        <p className={`text-lg sm:text-xl font-semibold font-mono ${tone}`}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
