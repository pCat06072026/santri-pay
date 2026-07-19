import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Save, RotateCcw, Send } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/pengaturan/")({
  component: PengaturanPage,
});

const DEFAULT_REMINDER = `*Pengingat Pembayaran Pesantren*

Assalamu'alaikum Bpk/Ibu *{nama_wali}*,

Kami informasikan tagihan santri:
• Nama : {nama_santri}
• NIS  : {nis}
• Kelas: {kelas}

📄 {jenis_tagihan} — {periode}{tahun_ajaran}
• Nominal : {nominal}
• Terbayar: {terbayar}
• *Sisa*   : {sisa}
• Jatuh Tempo: {jatuh_tempo}

Mohon segera diselesaikan. Terima kasih.

_Pesan otomatis dari Sistem Rekap Keuangan Pesantren._`;

const DEFAULT_LUNAS = `*Konfirmasi Pembayaran Lunas*

Assalamu'alaikum Bpk/Ibu *{nama_wali}*,

Alhamdulillah, pembayaran untuk santri *{nama_santri}* ({nis}) — {jenis_tagihan} {periode} telah *LUNAS*.

Total: {nominal}

Terima kasih atas kepercayaan Bpk/Ibu.

_Pesan otomatis dari Sistem Rekap Keuangan Pesantren._`;

function PengaturanPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const qc = useQueryClient();

  const [token, setToken] = useState("");
  const [reminder, setReminder] = useState(DEFAULT_REMINDER);
  const [lunas, setLunas] = useState(DEFAULT_LUNAS);
  const [showToken, setShowToken] = useState(false);

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Akses Ditolak</CardTitle>
            <CardDescription>Hanya admin yang dapat mengakses menu Pengaturan.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const saveSettings = useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      return res.json();
    },
    onSuccess: () => {
      toast.success("Pengaturan tersimpan");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveToken = () => {
    saveSettings.mutate({ fonnte_token: token });
  };

  const saveReminder = () => {
    saveSettings.mutate({ wa_template_reminder: reminder });
  };

  const saveLunas = () => {
    saveSettings.mutate({ wa_template_lunas: lunas });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl">
      <Tabs defaultValue="fonnte">
        <TabsList>
          <TabsTrigger value="fonnte">Fonnte</TabsTrigger>
          <TabsTrigger value="template">Template WA</TabsTrigger>
        </TabsList>

        <TabsContent value="fonnte" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Token Fonnte</CardTitle>
              <CardDescription>
                Token perangkat WhatsApp dari dashboard Fonnte. Token disimpan di database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="token"
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Masukkan token Fonnte"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowToken((v) => !v)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dapatkan token di <span className="font-mono">fonnte.com</span> → Device → Token.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveToken} disabled={saveSettings.isPending}>
                  <Save className="h-4 w-4 mr-2" /> Simpan Token
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="template" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Pengingat Tagihan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                rows={14}
                className="font-mono text-xs"
              />
              <div className="flex gap-2">
                <Button onClick={saveReminder} disabled={saveSettings.isPending}>
                  <Save className="h-4 w-4 mr-2" /> Simpan
                </Button>
                <Button variant="outline" onClick={() => setReminder(DEFAULT_REMINDER)}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset Default
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Konfirmasi Lunas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={lunas}
                onChange={(e) => setLunas(e.target.value)}
                rows={12}
                className="font-mono text-xs"
              />
              <div className="flex gap-2">
                <Button onClick={saveLunas} disabled={saveSettings.isPending}>
                  <Save className="h-4 w-4 mr-2" /> Simpan
                </Button>
                <Button variant="outline" onClick={() => setLunas(DEFAULT_LUNAS)}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
