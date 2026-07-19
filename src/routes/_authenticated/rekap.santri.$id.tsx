import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  User, Calendar, GraduationCap, MapPin, CheckCircle2, XCircle,
  Clock, Receipt, History
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { rupiah } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/rekap/santri/$id")({
  head: () => ({ meta: [{ title: "Detail Rekap Santri — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: RekapSantriDetailPage,
});

const statusColor: Record<string, string> = {
  aktif: "bg-[color:var(--success)]/15 text-[color:var(--success)]",
  lulus: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  keluar: "bg-destructive/15 text-destructive",
  pindah: "bg-muted text-muted-foreground",
};

const statusTagihanColor: Record<string, string> = {
  belum_bayar: "bg-destructive/15 text-destructive",
  sebagian: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  lunas: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  batal: "bg-muted text-muted-foreground",
};

function RekapSantriDetailPage() {
  const { id } = Route.useParams();

  const { data: santri, isLoading: santriLoading } = useQuery({
    queryKey: ["rekap_santri_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("santri")
        .select("*, kelas:kelas_id(nama, tingkat)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: riwayatKelas = [], isLoading: kelasLoading } = useQuery({
    queryKey: ["riwayat_kelas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("riwayat_kelas")
        .select("*")
        .eq("santri_id", id)
        .order("created_at", { ascending: false });
      if (error && error.code !== "42P01") throw error;
      return data || [];
    },
  });

  const { data: tagihan = [], isLoading: tagihanLoading } = useQuery({
    queryKey: ["tagihan_santri", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tagihan")
        .select("*, jenis_tagihan:jenis_tagihan_id(nama), tahun_ajaran:tahun_ajaran_id(nama)")
        .eq("santri_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pembayaran = [], isLoading: bayarLoading } = useQuery({
    queryKey: ["pembayaran_santri", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pembayaran")
        .select("*, tagihan:tagihan_id(periode_label, jenis_tagihan:jenis_tagihan_id(nama))")
        // Filter by joining conceptually, but since we can't join top-level easily without postgrest custom,
        // we fetch all for this santri by mapping tagihan_ids
        .in("tagihan_id", tagihan.map(t => t.id).length > 0 ? tagihan.map(t => t.id) : ["00000000-0000-0000-0000-000000000000"])
        .order("tanggal", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: tagihan.length > 0,
  });

  if (santriLoading) {
    return <div className="p-8 text-center text-muted-foreground">Memuat detail santri...</div>;
  }

  if (!santri) {
    return <div className="p-8 text-center text-destructive">Santri tidak ditemukan.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Profile */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="h-24 w-24 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <User className="h-10 w-10" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{santri.nama_lengkap}</h1>
            <Badge variant="outline" className={`font-normal capitalize ${statusColor[santri.status] || ""}`}>
              {santri.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs border rounded px-1">{santri.nis}</span>
            </div>
            {santri.kelas && (
              <div className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                {santri.kelas.tingkat} {santri.kelas.nama}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Masuk tahun {santri.tahun_masuk}
            </div>
            {santri.alamat && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {santri.alamat}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Data Wali</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground inline-block w-20">Nama:</span> {santri.nama_wali}</p>
            <p><span className="text-muted-foreground inline-block w-20">No. WA:</span> {santri.no_wa_wali || "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tagihan" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tagihan">Semua Tagihan</TabsTrigger>
          <TabsTrigger value="pembayaran">Riwayat Pembayaran</TabsTrigger>
          <TabsTrigger value="kelas">Riwayat Kelas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tagihan" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tahun Ajaran</TableHead>
                      <TableHead>Jenis Tagihan</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead className="text-right">Terbayar</TableHead>
                      <TableHead className="text-right">Sisa</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tagihanLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat tagihan…</TableCell></TableRow>
                    ) : tagihan.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada tagihan.</TableCell></TableRow>
                    ) : tagihan.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.tahun_ajaran?.nama}</TableCell>
                        <TableCell className="font-medium">{t.jenis_tagihan?.nama}</TableCell>
                        <TableCell>{t.periode_label}</TableCell>
                        <TableCell className="text-right font-mono">{rupiah(t.nominal)}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">{rupiah(t.terbayar)}</TableCell>
                        <TableCell className="text-right font-mono text-destructive">{rupiah(t.sisa)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-normal capitalize ${statusTagihanColor[t.status] || ""}`}>
                            {t.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pembayaran" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Kwitansi</TableHead>
                      <TableHead>Tagihan</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bayarLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat pembayaran…</TableCell></TableRow>
                    ) : pembayaran.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada pembayaran.</TableCell></TableRow>
                    ) : pembayaran.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{format(new Date(p.tanggal), "dd MMM yyyy", { locale: localeId })}</TableCell>
                        <TableCell className="font-mono text-xs">{p.nomor_kwitansi || p.id.split("-")[0].toUpperCase()}</TableCell>
                        <TableCell>
                          {p.tagihan?.jenis_tagihan?.nama} - {p.tagihan?.periode_label}
                        </TableCell>
                        <TableCell className="capitalize">{p.metode}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{rupiah(p.jumlah)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kelas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Aktivitas</TableHead>
                      <TableHead>Tahun Ajaran</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kelasLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat riwayat kelas…</TableCell></TableRow>
                    ) : riwayatKelas.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada riwayat kelas.</TableCell></TableRow>
                    ) : riwayatKelas.map((rk) => (
                      <TableRow key={rk.id}>
                        <TableCell>{format(new Date(rk.created_at), "dd MMM yyyy", { locale: localeId })}</TableCell>
                        <TableCell className="capitalize">{rk.jenis.replace("_", " ")}</TableCell>
                        <TableCell>{rk.tahun_ajaran_nama || "—"}</TableCell>
                        <TableCell>{rk.kelas_nama || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{rk.catatan || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
