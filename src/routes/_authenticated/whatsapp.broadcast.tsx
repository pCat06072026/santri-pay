import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { MessageCircle, Send, CheckSquare, Square, CheckCircle2, History } from "lucide-react";

import { sendWhatsappServer } from "@/lib/whatsapp-server";

import { supabase } from "@/integrations/supabase/client";
import { rupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/whatsapp/broadcast")({
  head: () => ({ meta: [{ title: "Broadcast WA — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: BroadcastWAPage,
});

function BroadcastWAPage() {
  const [mode, setMode] = useState<"tagihan" | "pengumuman">("pengumuman");
  const [kelasFilter, setKelasFilter] = useState("all");
  const [jkFilter, setJkFilter] = useState("all");
  const [tahunFilter, setTahunFilter] = useState("all");
  const [customMsg, setCustomMsg] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Progress state
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);
  const [sendStats, setSendStats] = useState({ sent: 0, failed: 0 });

  // Data fetching
  const { data: kelasOpts = [] } = useQuery({
    queryKey: ["kelas", "opts"],
    queryFn: async () => {
      const { data } = await supabase.from("kelas").select("id,nama,tingkat").order("tingkat");
      return data ?? [];
    },
  });

  const { data: tahunList = [] } = useQuery({
    queryKey: ["tahun_ajaran"],
    queryFn: async () => {
      const { data } = await supabase.from("tahun_ajaran").select("id,nama,is_aktif").order("nama", { ascending: false });
      return data ?? [];
    },
  });

  // Query Santri (for Pengumuman)
  const { data: santriList = [], isLoading: loadingSantri } = useQuery({
    queryKey: ["santri_broadcast", kelasFilter, jkFilter],
    queryFn: async () => {
      let q = supabase.from("santri").select("id,nama_lengkap,nis,kelas_id,jenis_kelamin,no_wa_wali,kelas:kelas_id(nama,tingkat)").eq("status", "aktif");
      if (kelasFilter !== "all") q = q.eq("kelas_id", kelasFilter);
      if (jkFilter !== "all") q = q.eq("jenis_kelamin", jkFilter as "L" | "P");
      const { data } = await q;
      return data ?? [];
    },
  });

  // Query Tagihan (for Tagihan)
  const { data: tagihanList = [], isLoading: loadingTagihan } = useQuery({
    queryKey: ["tagihan_broadcast", tahunFilter, kelasFilter],
    queryFn: async () => {
      let q = supabase.from("tagihan")
        .select("id,nominal,sisa,periode_label,tahun_ajaran_id,santri:santri_id(id,nama_lengkap,nis,kelas_id,kelas:kelas_id(nama,tingkat)),jenis_tagihan:jenis_tagihan_id(nama)")
        .in("status", ["belum_bayar", "sebagian"]);
      if (tahunFilter !== "all") q = q.eq("tahun_ajaran_id", tahunFilter);
      const { data } = await q;
      let res = data ?? [];
      if (kelasFilter !== "all") res = res.filter((r: any) => r.santri?.kelas_id === kelasFilter);
      return res;
    },
  });

  // Selection toggle
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };
  
  const toggleSelectAll = (ids: string[]) => {
    if (selectedIds.size === ids.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ids));
    }
  };

  // Helper to chunk array
  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );
  };

  const handleBroadcast = async () => {
    if (selectedIds.size === 0) return toast.error("Pilih penerima broadcast terlebih dahulu");
    if (mode === "pengumuman" && !customMsg.trim()) return toast.error("Pesan pengumuman tidak boleh kosong");

    setIsSending(true);
    setTotalToSend(selectedIds.size);
    setProgress(0);
    setSendStats({ sent: 0, failed: 0 });

    try {
      const { data: authSession } = await supabase.auth.getSession();
      const accessToken = authSession.session?.access_token;

      let currentSent = 0;
      let currentFailed = 0;

      if (mode === "tagihan") {
        const ids = Array.from(selectedIds);
        const chunks = chunkArray(ids, 10);
        let processed = 0;
        
        for (const chunk of chunks) {
          const res = await sendWhatsappServer({ data: { tagihan_ids: chunk, template: "reminder", accessToken } });
          const payload = res && typeof res === "object" && "data" in res ? (res as any).data : res;
          currentSent += payload?.sent || 0;
          currentFailed += payload?.failed || 0;
          
          processed += chunk.length;
          setProgress(Math.round((processed / ids.length) * 100));
          setSendStats({ sent: currentSent, failed: currentFailed });
        }
      } else {
        // Mode Pengumuman
        const targets = Array.from(selectedIds).map(id => santriList.find(s => s.id === id)).filter(Boolean);
        
        // Flatten contacts (ayah and ibu if available)
        const broadcastPayload: any[] = [];
        for (const s of targets) {
          if (s?.no_wa_wali) broadcastPayload.push({ target: s.no_wa_wali, message: customMsg, santri_id: s.id });
        }
        
        // Because 1 santri might have 2 numbers, totalToSend for progress is the payload length
        const chunks = chunkArray(broadcastPayload, 10);
        let processed = 0;
        const totalPayload = broadcastPayload.length;
        
        if (totalPayload === 0) {
          throw new Error("Tidak ada nomor WA yang valid pada santri terpilih");
        }
        
        for (const chunk of chunks) {
          const res = await sendWhatsappServer({ data: { broadcast: chunk, accessToken } });
          const payload = res && typeof res === "object" && "data" in res ? (res as any).data : res;
          currentSent += payload?.sent || 0;
          currentFailed += payload?.failed || 0;
          
          processed += chunk.length;
          setProgress(Math.round((processed / totalPayload) * 100));
          setSendStats({ sent: currentSent, failed: currentFailed });
        }
      }
      
      toast.success("Broadcast selesai!");
      setSelectedIds(new Set());
      setCustomMsg("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan saat broadcast");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Broadcast WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Kirim pesan massal ke orang tua/wali santri.</p>
      </div>

      {isSending && (
        <Card className="border-primary/50 shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                  Mengirim Broadcast...
                </h3>
                <p className="text-sm text-muted-foreground">Mohon jangan tutup halaman ini hingga selesai.</p>
              </div>
              <div className="text-right text-sm">
                <div>Terkirim: <span className="text-emerald-600 font-bold">{sendStats.sent}</span></div>
                <div>Gagal: <span className="text-destructive font-bold">{sendStats.failed}</span></div>
              </div>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-right font-mono">{progress}% Selesai</p>
          </CardContent>
        </Card>
      )}

      <Tabs 
        value={mode} 
        onValueChange={(v) => { 
          setMode(v as any); 
          setSelectedIds(new Set()); 
        }}
      >
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
          <TabsTrigger value="pengumuman" disabled={isSending}>Pengumuman Umum</TabsTrigger>
          <TabsTrigger value="tagihan" disabled={isSending}>Penagihan Tunggakan</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex flex-col sm:flex-row gap-3 bg-muted/30 p-3 rounded-lg border">
          <Select value={kelasFilter} onValueChange={setKelasFilter} disabled={isSending}>
            <SelectTrigger className="w-full sm:w-48 bg-background"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {kelasOpts.map((k) => <SelectItem key={k.id} value={k.id}>{k.tingkat} {k.nama}</SelectItem>)}
            </SelectContent>
          </Select>
          
          {mode === "pengumuman" && (
            <Select value={jkFilter} onValueChange={setJkFilter} disabled={isSending}>
              <SelectTrigger className="w-full sm:w-48 bg-background"><SelectValue placeholder="Semua Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Gender</SelectItem>
                <SelectItem value="l">Laki-laki (Putra)</SelectItem>
                <SelectItem value="p">Perempuan (Putri)</SelectItem>
              </SelectContent>
            </Select>
          )}

          {mode === "tagihan" && (
            <Select value={tahunFilter} onValueChange={setTahunFilter} disabled={isSending}>
              <SelectTrigger className="w-full sm:w-48 bg-background"><SelectValue placeholder="Semua Tahun Ajaran" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun Ajaran</SelectItem>
                {tahunList.map((t) => <SelectItem key={t.id} value={t.id}>{t.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="pengumuman" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <label className="text-sm font-medium">Isi Pesan Pengumuman</label>
              <Textarea 
                placeholder="Ketik pengumuman di sini..." 
                rows={5} 
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                disabled={isSending}
              />
              <p className="text-xs text-muted-foreground">Pesan ini akan dikirim ke nomor Wali dan Ibu (jika ada) dari setiap santri yang dipilih di bawah.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-[50px] text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleSelectAll(santriList.map((s: any) => s.id))}
                          disabled={isSending || santriList.length === 0}
                        >
                          {santriList.length > 0 && selectedIds.size === santriList.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </Button>
                      </TableHead>
                      <TableHead>NIS</TableHead>
                      <TableHead>Nama Santri</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>No. WA Wali</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingSantri ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat santri...</TableCell></TableRow>
                    ) : santriList.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada santri.</TableCell></TableRow>
                    ) : santriList.map((s: any) => (
                      <TableRow key={s.id} className="hover:bg-accent/50 cursor-pointer" onClick={() => !isSending && toggleSelect(s.id)}>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleSelect(s.id)} disabled={isSending}>
                            {selectedIds.has(s.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{s.nis}</TableCell>
                        <TableCell className="font-medium">{s.nama_lengkap}</TableCell>
                        <TableCell>{s.kelas ? `${s.kelas.tingkat} ${s.kelas.nama}` : "—"}</TableCell>
                        <TableCell className="text-xs">
                          {s.no_wa_wali && <div>Wali: <span className="font-mono">{s.no_wa_wali}</span></div>}
                          {s.no_wa_ibu_not_used && <div>Ibu: <span className="font-mono">{s.no_wa_ibu_not_used}</span></div>}
                          {!s.no_wa_wali && !s.no_wa_ibu_not_used && <span className="text-destructive font-mono opacity-80">Kosong</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tagihan" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-[50px] text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleSelectAll(tagihanList.map((t: any) => t.id))}
                          disabled={isSending || tagihanList.length === 0}
                        >
                          {tagihanList.length > 0 && selectedIds.size === tagihanList.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </Button>
                      </TableHead>
                      <TableHead>Nama Santri</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Jenis Tagihan</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Sisa Tagihan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTagihan ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Memuat tagihan...</TableCell></TableRow>
                    ) : tagihanList.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada tagihan tertunggak.</TableCell></TableRow>
                    ) : tagihanList.map((t: any) => (
                      <TableRow key={t.id} className="hover:bg-accent/50 cursor-pointer" onClick={() => !isSending && toggleSelect(t.id)}>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleSelect(t.id)} disabled={isSending}>
                            {selectedIds.has(t.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{t.santri?.nama_lengkap}</TableCell>
                        <TableCell>{t.santri?.kelas ? `${t.santri.kelas.tingkat} ${t.santri.kelas.nama}` : "—"}</TableCell>
                        <TableCell>{t.jenis_tagihan?.nama}</TableCell>
                        <TableCell>{t.periode_label}</TableCell>
                        <TableCell className="text-right text-destructive font-mono font-medium">{rupiah(t.sisa)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t shadow-lg flex justify-end z-50">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between sm:justify-end gap-4">
          <div className="text-sm">
            <span className="font-bold">{selectedIds.size}</span> terpilih
          </div>
          <Button size="lg" onClick={handleBroadcast} disabled={isSending || selectedIds.size === 0}>
            <Send className="w-5 h-5 mr-2" />
            Kirim Broadcast
          </Button>
        </div>
      </div>
    </div>
  );
}
