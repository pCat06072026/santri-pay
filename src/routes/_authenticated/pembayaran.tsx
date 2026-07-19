import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Eye, Printer } from "lucide-react";

import { rupiah, formatDate } from "@/lib/format";
import { usePembayaran } from "@/hooks/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/pembayaran")({
  head: () => ({ meta: [{ title: "Pembayaran — Pesantren" }, { name: "robots", content: "noindex" }] }),
  component: PembayaranPage,
});

function PembayaranPage() {
  const [search, setSearch] = useState("");
  const [metode, setMetode] = useState<string>("all");

  const { data: pembayaranData, isLoading } = usePembayaran(100);

  const filtered = useMemo(() => {
    const data = pembayaranData?.pembayaran || [];
    if (!search.trim()) return data;
    const s = search.trim().toLowerCase();
    return data.filter((r) =>
      r.studentNama?.toLowerCase().includes(s) ||
      r.studentNis?.toLowerCase().includes(s) ||
      r.referencia?.toLowerCase().includes(s)
    );
  }, [pembayaranData, search]);

  const total = filtered.reduce((s, r) => s + Number(r.jumlah), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-muted-foreground">Riwayat seluruh pembayaran.</p>
        <p className="text-sm">Total ditampilkan: <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{rupiah(total)}</span></p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama / NIS / referensi…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={metode} onValueChange={setMetode}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Metode</SelectItem>
            <SelectItem value="tunai">Tunai</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="qris">QRIS</SelectItem>
            <SelectItem value="lainnya">Lainnya</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Santri</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Ref</TableHead>
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
                    <TableCell className="whitespace-nowrap">{formatDate(r.tanggal)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{r.studentNama || "-"}</p>
                        <p className="text-xs text-muted-foreground">{r.studentNis || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>{r.jenisTagihanNama || "-"}</TableCell>
                    <TableCell>{r.tagihanPeriode || "-"}</TableCell>
                    <TableCell className="text-right font-semibold">{rupiah(r.jumlah)}</TableCell>
                    <TableCell><span className="capitalize">{r.metode}</span></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{r.referencia || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Link to="/kwitansi/$id" params={{ id: r.id }}>
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
    </div>
  );
}
