import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/pengaturan/audit")({
  component: AuditPage,
});

const TABLES = [
  "all",
  "tagihan",
  "pembayaran",
  "santri",
  "kelas",
  "jenis_tagihan",
  "tahun_ajaran",
  "app_settings",
  "user_roles",
  "profiles",
];

const ACTIONS = ["all", "create", "update", "delete"];

function AuditPage() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [tableName, setTableName] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<any>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["audit_logs", tableName, action],
    enabled: !authLoading && isAdmin,
    retry: 2,
    queryFn: async () => {
      let q = (supabase as any)
        .from("audit_logs")
        .select("id,table_name,record_id,action,changed_by,old_data,new_data,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (tableName !== "all") q = q.eq("table_name", tableName);
      if (action !== "all") q = q.eq("action", action);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const ids = Array.from(new Set(rows.map((r) => r.changed_by).filter(Boolean)));
      let profMap: Record<string, { full_name: string; username: string }> = {};
      if (ids.length > 0) {
        const { data: profs } = await (supabase as any)
          .from("profiles").select("id,full_name,username").in("id", ids);
        (profs ?? []).forEach((p: any) => { profMap[p.id] = p; });
      }
      return rows.map((r) => ({ ...r, profile: r.changed_by ? profMap[r.changed_by] : null }));
    },
  });

  const filtered = data.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.record_id?.toLowerCase().includes(s) ||
      r.table_name?.toLowerCase().includes(s) ||
      r.profile?.full_name?.toLowerCase().includes(s) ||
      r.profile?.username?.toLowerCase().includes(s)
    );
  });

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Akses Ditolak</CardTitle>
            <CardDescription>Hanya admin yang dapat melihat riwayat audit.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Audit</CardTitle>
          <CardDescription>300 aktivitas terakhir pada data sistem.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari record id / user…" className="pl-8" />
            </div>
            <Select value={tableName} onValueChange={setTableName}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TABLES.map((t) => <SelectItem key={t} value={t}>{t === "all" ? "Semua Tabel" : t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a === "all" ? "Semua Aksi" : a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Waktu</TableHead>
                  <TableHead>Tabel</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Oleh</TableHead>
                  <TableHead className="hidden md:table-cell">Record</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Memuat…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Tidak ada data.</TableCell></TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{r.table_name}</TableCell>
                    <TableCell>
                      <Badge variant={r.action === "delete" ? "destructive" : r.action === "create" ? "default" : "secondary"} className="capitalize">
                        {r.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.profile?.full_name ?? "-"}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs font-mono truncate max-w-[160px]">{r.record_id}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Detail</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Perubahan</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Tabel:</span> <span className="font-mono">{detail.table_name}</span></div>
                <div><span className="text-muted-foreground">Aksi:</span> <span className="capitalize">{detail.action}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Record ID:</span> <span className="font-mono">{detail.record_id}</span></div>
                <div><span className="text-muted-foreground">Oleh:</span> {detail.profile?.full_name ?? "-"}</div>
                <div><span className="text-muted-foreground">Waktu:</span> {new Date(detail.created_at).toLocaleString("id-ID")}</div>
              </div>
              {detail.old_data && (
                <div>
                  <p className="font-medium mb-1">Sebelum</p>
                  <pre className="bg-muted p-3 rounded overflow-x-auto text-[11px]">{JSON.stringify(detail.old_data, null, 2)}</pre>
                </div>
              )}
              {detail.new_data && (
                <div>
                  <p className="font-medium mb-1">Sesudah</p>
                  <pre className="bg-muted p-3 rounded overflow-x-auto text-[11px]">{JSON.stringify(detail.new_data, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
