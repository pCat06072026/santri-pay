import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Shield, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/pengaturan/pengguna")({
  head: () => ({ meta: [{ title: "Manajemen Pengguna" }, { name: "robots", content: "noindex" }] }),
  component: PenggunaPage,
});

type RoleValue = "admin" | "bendahara" | "none";

function PenggunaPage() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === "admin";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["users_and_roles"],
    enabled: !authLoading && isAdmin,
    retry: 2,
    queryFn: async () => {
      const [{ data: profiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("id,username,full_name,is_active,created_at").order("created_at"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
      return (profiles ?? []).map((p: any) => ({ ...p, role: (roleMap.get(p.id) ?? null) as string | null }));
    },
  });

  const setRoleMut = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: RoleValue }) => {
      // Hapus semua role user, lalu insert satu jika bukan 'none'.
      const del = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (del.error) throw del.error;
      if (role !== "none") {
        const ins = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (ins.error) throw ins.error;
      }
    },
    onSuccess: () => {
      toast.success("Role diperbarui");
      qc.invalidateQueries({ queryKey: ["users_and_roles"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal memperbarui role"),
  });

  const toggleActiveMut = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status pengguna diperbarui");
      qc.invalidateQueries({ queryKey: ["users_and_roles"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal"),
  });

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Akses Ditolak</CardTitle>
            <CardDescription>Hanya admin yang dapat mengelola pengguna.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const filtered = data.filter((u: any) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return u.username?.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s);
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Manajemen Pengguna</CardTitle>
          <CardDescription>
            Kelola role tiap pengguna. Pengguna baru dibuat melalui halaman Daftar; di sini admin memberikan role Admin atau Bendahara.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Cari nama atau username…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Memuat…</TableCell></TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Tidak ada pengguna.</TableCell></TableRow>
                )}
                {filtered.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">@{u.username}</TableCell>
                    <TableCell>
                      {u.role ? <Badge variant="secondary" className="capitalize">{u.role}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "default" : "outline"}>
                        {u.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Select
                          value={(u.role ?? "none") as string}
                          onValueChange={(v) => setRoleMut.mutate({ userId: u.id, role: v as RoleValue })}
                          disabled={u.id === profile?.id}
                        >
                          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="bendahara">Bendahara</SelectItem>
                            <SelectItem value="none">Tanpa Role</SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => toggleActiveMut.mutate({ userId: u.id, active: !u.is_active })}
                          disabled={u.id === profile?.id}
                          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                        >
                          {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Anda tidak dapat mengubah role atau menonaktifkan akun Anda sendiri.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
