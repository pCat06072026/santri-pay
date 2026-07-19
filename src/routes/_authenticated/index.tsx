import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Wallet, AlertCircle, TrendingUp, GraduationCap, UserCheck, UserX, School, FileText, CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { rupiah, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { usePembayaran } from "@/hooks/api";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Sistem Rekap Keuangan Pesantren" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const toneClass: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-[color:var(--success)]/10 text-[color:var(--success)]",
  warning: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
const monthLabel = (d: Date) => d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });

function Dashboard() {
  const { profile } = useAuth();

  // Fetch payments data using our API hook
  const { data: pembayaranData, isLoading: paymentsLoading } = usePembayaran(10);

  // Calculate stats from payments
  const statsData = {
    total: 0,
    aktif: 0,
    lulus: 0,
    keluar: 0,
    kelas: 0,
    lunas: 0,
    belum: 0,
    sebagian: 0,
    totalNominal: 0,
    totalTerbayar: 0,
    totalSisa: 0,
  };

  // Calculate monthly data
  const now = new Date();
  const start = addMonths(startOfMonth(now), -5);
  const buckets: { key: string; label: string; total: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = addMonths(start, i);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabel(d), total: 0 });
  }

  // Group payments by month
  const payments = pembayaranData?.pembayaran || [];
  payments.forEach((p: any) => {
    const d = new Date(p.tanggal);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.total += Number(p.jumlah);
  });

  const bulanIni = buckets[buckets.length - 1]?.total ?? 0;

  const stats = [
    { label: "Total Santri", value: statsData.total || "—", icon: Users, tone: "primary" },
    { label: "Santri Aktif", value: statsData.aktif || "—", icon: UserCheck, tone: "success" },
    { label: "Santri Lulus", value: statsData.lulus || "—", icon: GraduationCap, tone: "warning" },
    { label: "Santri Keluar", value: statsData.keluar || "—", icon: UserX, tone: "muted" },
    { label: "Pemasukan Bulan Ini", value: bulanIni > 0 ? rupiah(bulanIni) : "—", icon: Wallet, tone: "primary" },
    { label: "Tagihan Lunas", value: statsData.lunas || "—", icon: TrendingUp, tone: "success" },
    { label: "Belum/Sebagian", value: (statsData.belum + statsData.sebagian) || "—" , icon: AlertCircle, tone: "destructive" },
    { label: "Kelas", value: statsData.kelas || "—", icon: School, tone: "muted" },
  ];

  const recentPayments = payments.slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Selamat datang, <span className="font-medium text-foreground">{profile?.fullName || profile?.full_name || 'User'}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/60">
              <CardContent className="p-4">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${toneClass[s.tone]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold mt-1 truncate">{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pemasukan 6 Bulan Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}jt` : v >= 1000 ? `${Math.round(v/1000)}rb` : String(v)} />
                <Tooltip
                  formatter={(v: any) => rupiah(Number(v))}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ringkasan Keuangan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Tagihan</span><span className="font-medium">{statsData.totalNominal > 0 ? rupiah(statsData.totalNominal) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Terbayar</span><span className="font-medium text-[color:var(--success)]">{statsData.totalTerbayar > 0 ? rupiah(statsData.totalTerbayar) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Sisa</span><span className="font-medium text-destructive">{statsData.totalSisa > 0 ? rupiah(statsData.totalSisa) : "—"}</span></div>
            <div className="pt-3 border-t space-y-2">
              <Link to="/tagihan" className="flex items-center gap-2 text-sm hover:text-primary"><FileText className="h-4 w-4" /> Kelola Tagihan</Link>
              <Link to="/pembayaran" className="flex items-center gap-2 text-sm hover:text-primary"><CreditCard className="h-4 w-4" /> Riwayat Pembayaran</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pembayaran Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada pembayaran.</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((r: any) => (
                <Link
                  key={r.id}
                  to="/kwitansi/$id"
                  params={{ id: r.id }}
                  className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/50 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.studentNama || r.student?.nama_lengkap || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.jenisTagihanNama || r.tagihan?.jenis_tagihan?.nama || "—"} · {r.tagihanPeriode || r.tagihan?.periode_label || "—"} · {formatDate(r.tanggal)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{r.metode}</Badge>
                    <span className="font-semibold">{rupiah(Number(r.jumlah))}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
