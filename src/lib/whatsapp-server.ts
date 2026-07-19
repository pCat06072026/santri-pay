import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function normalizePhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export const sendWhatsappServer = createServerFn({ method: "POST" })
  .handler(async ({ data: body }: { data: any }) => {
  try {
    if (!body.accessToken) throw new Error("Akses ditolak");
    
    // Create authenticated client for RLS
    const supabaseUrl = typeof process !== "undefined" && process.env.VITE_SUPABASE_URL 
      ? process.env.VITE_SUPABASE_URL 
      : import.meta.env.VITE_SUPABASE_URL;
      
    const supabaseKey = typeof process !== "undefined" && process.env.VITE_SUPABASE_PUBLISHABLE_KEY 
      ? process.env.VITE_SUPABASE_PUBLISHABLE_KEY 
      : import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${body.accessToken}` } },
    });

    // 1. Dapatkan token dari app_settings
    const { data: settings, error: sErr } = await supabase
      .from("app_settings")
      .select("key,value")
      .in("key", ["fonnte_token", "wa_template_reminder", "wa_template_lunas"]);
      
    if (sErr) throw sErr;
    
    const map = Object.fromEntries((settings ?? []).map((r: any) => [r.key, r.value ?? ""]));
    const token = (map.fonnte_token || "").trim();
    if (!token) throw new Error("Token Fonnte belum diatur. Buka menu Pengaturan.");

    let sent = 0;
    let failed = 0;
    const logsToInsert: any[] = [];
    const results: any[] = [];
    
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    // Helper untuk merender template
    const renderTemplate = (tpl: string, vars: Record<string, string>) => {
      return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
    };

    // Helper kirim
    const fonnteSend = async (target: string, message: string) => {
      const form = new URLSearchParams();
      form.append("target", target);
      form.append("message", message);
      // countryCode tidak dikirim karena format nomor sudah dipastikan berawalan 62
      const res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { 
          Authorization: token,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form.toString(),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok && json?.status !== false, body: json };
    };

    // Mode 3: Broadcast Massal
    if (body.broadcast && Array.isArray(body.broadcast)) {
      for (const b of body.broadcast) {
        const phone = normalizePhone(b.target);
        if (!phone) {
          failed++;
          logsToInsert.push({ santri_id: b.santri_id, nomor_tujuan: b.target, pesan: b.message, status: "gagal", keterangan: "Nomor tidak valid", created_by: userId });
          continue;
        }

        const r = await fonnteSend(phone, b.message);
        if (r.ok) sent++; else failed++;
        
        logsToInsert.push({ santri_id: b.santri_id, nomor_tujuan: phone, pesan: b.message, status: r.ok ? "terkirim" : "gagal", keterangan: r.ok ? null : JSON.stringify(r.body), created_by: userId });
      }
    }
    // Mode 1: Tagihan
    else if (body.tagihan_ids && body.tagihan_ids.length > 0) {
      const templateKey = body.template === "lunas" ? "wa_template_lunas" : "wa_template_reminder";
      const template = map[templateKey] || "";
      if (!template) throw new Error("Template pesan belum diatur.");

      const { data: tagihan, error: tErr } = await supabase
        .from("tagihan")
        .select("id,nominal,terbayar,sisa,status,periode_label,jatuh_tempo,santri_id," +
          "santri:santri_id(nama_lengkap,nis,nama_wali,no_wa_wali,kelas:kelas_id(nama,tingkat))," +
          "jenis_tagihan:jenis_tagihan_id(nama)," +
          "tahun_ajaran:tahun_ajaran_id(nama)")
        .in("id", body.tagihan_ids);
      if (tErr) throw tErr;

      for (const t of tagihan ?? []) {
        const s = (t as any).santri;
        const kelas = s?.kelas ? `${s.kelas.tingkat} ${s.kelas.nama}` : "-";
        const ta = (t as any).tahun_ajaran?.nama ?? "";

        const targets: { nomor: string; namaWali: string }[] = [];
        if (s?.no_wa_wali) {
          const phone = normalizePhone(s.no_wa_wali);
          if (phone) targets.push({ nomor: phone, namaWali: s.nama_wali ?? "Wali" });
        }

        if (!targets.length) {
          failed++;
          logsToInsert.push({ tagihan_id: t.id, santri_id: t.santri_id, nomor_tujuan: "-", pesan: "(Gagal Generate)", status: "gagal", keterangan: "no_wa_wali kosong", created_by: userId });
          continue;
        }

        for (const target of targets) {
          const rupiah = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
          const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-";
          
          const message = renderTemplate(template, {
            nama_wali: target.namaWali,
            nama_santri: s?.nama_lengkap ?? "",
            nis: s?.nis ?? "",
            kelas,
            jenis_tagihan: (t as any).jenis_tagihan?.nama ?? "Tagihan",
            periode: t.periode_label ?? "",
            tahun_ajaran: ta ? ` (TA ${ta})` : "",
            nominal: rupiah(Number(t.nominal)),
            terbayar: rupiah(Number(t.terbayar)),
            sisa: rupiah(Number(t.sisa)),
            jatuh_tempo: formatDate(t.jatuh_tempo),
          });
          
          const r = await fonnteSend(target.nomor, message);
          if (r.ok) sent++; else failed++;
          results.push({ tagihan_id: t.id, target: target.nomor, ok: r.ok, error: r.ok ? undefined : JSON.stringify(r.body) });
          
          logsToInsert.push({
            tagihan_id: t.id,
            santri_id: t.santri_id,
            nomor_tujuan: target.nomor,
            pesan: message,
            status: r.ok ? "terkirim" : "gagal",
            keterangan: r.ok ? null : JSON.stringify(r.body),
            created_by: userId
          });
        }
      }
    }
    // Mode 2: Test / Custom tunggal
    else if (body.target && body.message) {
      const phone = normalizePhone(body.target);
      if (!phone) throw new Error("Nomor tidak valid");
      const r = await fonnteSend(phone, body.message);
      
      logsToInsert.push({ nomor_tujuan: phone, pesan: body.message, status: r.ok ? "terkirim" : "gagal", keterangan: r.ok ? null : JSON.stringify(r.body), created_by: userId });
      if (r.ok) sent++; else failed++;
      results.push(r);
    }
    else {
      throw new Error("Tipe broadcast tidak didukung");
    }

    if (logsToInsert.length > 0) {
      await supabase.from("whatsapp_logs").insert(logsToInsert);
    }
    
    return { ok: true, sent, failed, results };
  } catch (err: any) {
    console.error("sendWhatsappServer Error:", err);
    throw new Error(err.message || "Gagal memproses pengiriman WhatsApp");
  }
});
