import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { ArrowLeft, Printer, Download, FileText, Loader2, Image as ImageIcon } from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { rupiah, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/kwitansi/$id")({
  head: () => ({ meta: [{ title: "Kwitansi Pembayaran" }, { name: "robots", content: "noindex" }] }),
  component: KwitansiPage,
});

const KW_KEYS = [
  "kwitansi_nama_lembaga",
  "kwitansi_alamat",
  "kwitansi_kota",
  "kwitansi_telepon",
  "kwitansi_email",
  "kwitansi_logo_url",
  "kwitansi_show_logo",
  "kwitansi_prefix_nomor",
  "kwitansi_footer_note",
  "kwitansi_penandatangan",
  "kwitansi_jabatan",
  "kwitansi_kota_ttd",
  "kwitansi_show_ttd",
];

function KwitansiPage() {
  const { id } = Route.useParams();
  const printRef = useRef<HTMLDivElement>(null);
  const [downloadingPNG, setDownloadingPNG] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["kwitansi_settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("app_settings").select("key,value").in("key", KW_KEYS);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = r.value ?? ""; });
      return map;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["kwitansi", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pembayaran")
        .select(
          "id,tanggal,jumlah,metode,referensi,catatan,created_at," +
          "tagihan:tagihan_id(id,periode_label,nominal,terbayar,sisa,status," +
          "santri:santri_id(nama_lengkap,nis,nama_wali,kelas:kelas_id(nama,tingkat))," +
          "jenis_tagihan:jenis_tagihan_id(nama)," +
          "tahun_ajaran:tahun_ajaran_id(nama))"
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as any;
    },
  });

  if (isLoading || !data) {
    return <div className="p-6 text-sm text-muted-foreground">Memuat kwitansi…</div>;
  }

  const t = data.tagihan;
  const s = t?.santri;
  const kelas = s?.kelas ? `${s.kelas.tingkat} ${s.kelas.nama}` : "-";

  const cfg = settings ?? {};
  const namaLembaga = cfg.kwitansi_nama_lembaga || "Pondok Pesantren";
  const alamat = cfg.kwitansi_alamat || "";
  const kota = cfg.kwitansi_kota || "";
  const telepon = cfg.kwitansi_telepon || "";
  const email = cfg.kwitansi_email || "";
  const logoUrl = cfg.kwitansi_logo_url || "";
  const showLogo = (cfg.kwitansi_show_logo ?? "1") === "1" && !!logoUrl;
  const prefix = cfg.kwitansi_prefix_nomor || "KW";
  const footerNote = cfg.kwitansi_footer_note || "";
  const penandatangan = cfg.kwitansi_penandatangan || "";
  const jabatan = cfg.kwitansi_jabatan || "Bendahara";
  const kotaTtd = cfg.kwitansi_kota_ttd || kota;
  const showTtd = (cfg.kwitansi_show_ttd ?? "1") === "1";

  const [base64Logo, setBase64Logo] = useState<string>("");

  useEffect(() => {
    if (showLogo && logoUrl) {
      fetch(logoUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.blob();
        })
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setBase64Logo(reader.result as string);
          };
          reader.readAsDataURL(blob);
        })
        .catch((e) => {
          console.error("Gagal memuat logo sebagai base64:", e);
          // Fallback ke URL asli jika gagal (mungkin terblokir CORS sepenuhnya)
          setBase64Logo(logoUrl);
        });
    }
  }, [showLogo, logoUrl]);

  // Gunakan nomor_kwitansi dari DB jika sudah di-generate, fallback ke UUID slice
  const nomor = data.nomor_kwitansi
    ? data.nomor_kwitansi
    : `${prefix}-${String(data.id).slice(0, 8).toUpperCase()}`;

  const fileName = `${s?.nama_lengkap ?? "Santri"}-${nomor}`;

  const handleDownloadPNG = async () => {
    if (!printRef.current) return;
    setDownloadingPNG(true);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(printRef.current, { 
        pixelRatio: 2,
        style: { margin: '0' }
      });
      
      if (!blob) {
        toast.error("Gagal mengonversi kwitansi ke PNG (Canvas kosong)");
        return;
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.png`;
      link.click();
      
      // Clean up memory
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Berhasil mengunduh PNG");
    } catch (e: any) {
      console.error(e);
      toast.error(`Gagal mengekspor PNG: ${e.message || String(e)}`);
    } finally {
      setDownloadingPNG(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setDownloadingPDF(true);
    try {
      const { toCanvas } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");
      
      const canvas = await toCanvas(printRef.current, { 
        pixelRatio: 2,
        style: { margin: '0' }
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5"
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // If height exceeds page height, adjust width to fit page
      if (pdfHeight > pdf.internal.pageSize.getHeight()) {
        const pageHeight = pdf.internal.pageSize.getHeight();
        const adjustedWidth = (canvas.width * pageHeight) / canvas.height;
        const xOffset = (pdfWidth - adjustedWidth) / 2;
        pdf.addImage(imgData, "PNG", xOffset, 0, adjustedWidth, pageHeight);
      } else {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      }
      
      pdf.save(`${fileName}.pdf`);
      toast.success("Berhasil mengunduh PDF");
    } catch (e: any) {
      console.error(e);
      toast.error(`Gagal mengekspor PDF: ${e.message || String(e)}`);
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-6 print:bg-white print:py-0">
      <style>{`
        @media print {
          @page { size: A5; margin: 10mm; }
          body * { visibility: hidden; }
          .print-sheet, .print-sheet * { visibility: visible; }
          .print-sheet { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 no-print flex flex-wrap items-center justify-between mb-4 gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/tagihan/$id" params={{ id: t?.id ?? "" }}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleDownloadPNG} disabled={downloadingPNG}>
            {downloadingPNG ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />} PNG
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadPDF} disabled={downloadingPDF} className="text-destructive hover:text-destructive">
            {downloadingPDF ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />} PDF
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Cetak
          </Button>
        </div>
      </div>

      <div ref={printRef} className="print-sheet max-w-2xl mx-auto bg-card border rounded-lg shadow-sm p-6 sm:p-8 print:shadow-none bg-white">
        <div className="flex items-start justify-between border-b pb-4 mb-4 gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {showLogo && (
              <img src={base64Logo || logoUrl} alt="Logo" className="h-14 w-14 object-contain shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Kwitansi Pembayaran</p>
              <h1 className="text-xl font-bold truncate">{namaLembaga}</h1>
              {alamat && <p className="text-xs text-muted-foreground whitespace-pre-line">{alamat}</p>}
              <p className="text-xs text-muted-foreground">
                {[kota, telepon, email].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="text-right text-xs shrink-0">
            <p className="text-muted-foreground">No. Kwitansi</p>
            <p className="font-mono font-semibold">{nomor}</p>
            <p className="text-muted-foreground mt-1">Tanggal</p>
            <p className="font-medium">{formatDate(data.tanggal)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Diterima dari</p>
            <p className="font-medium">{s?.nama_wali ?? "-"}</p>
            <p className="text-xs text-muted-foreground mt-2">Untuk Santri</p>
            <p className="font-medium">{s?.nama_lengkap ?? "-"}</p>
            <p className="text-xs text-muted-foreground">NIS: {s?.nis ?? "-"} · Kelas: {kelas}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Jenis Tagihan</p>
            <p className="font-medium">{t?.jenis_tagihan?.nama ?? "-"}</p>
            <p className="text-xs text-muted-foreground mt-2">Periode</p>
            <p className="font-medium">{t?.periode_label ?? "-"}{t?.tahun_ajaran?.nama ? ` · TA ${t.tahun_ajaran.nama}` : ""}</p>
          </div>
        </div>

        <div className="border-t border-b py-4 my-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Metode Pembayaran</span>
            <span className="font-medium capitalize">{data.metode}</span>
          </div>
          {data.referensi && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Referensi</span>
              <span className="font-mono text-xs">{data.referensi}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline mt-3 pt-3 border-t">
            <span className="text-sm text-muted-foreground">Jumlah Dibayar</span>
            <span className="text-2xl font-bold text-primary">{rupiah(Number(data.jumlah))}</span>
          </div>
        </div>

        {t && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between"><span>Total Tagihan</span><span>{rupiah(Number(t.nominal))}</span></div>
            <div className="flex justify-between"><span>Total Terbayar</span><span>{rupiah(Number(t.terbayar))}</span></div>
            <div className="flex justify-between font-medium text-foreground">
              <span>Sisa Tagihan</span>
              <span>{rupiah(Number(t.sisa))} {t.status === "lunas" && "(LUNAS)"}</span>
            </div>
          </div>
        )}

        {data.catatan && (
          <div className="mt-4 text-xs">
            <p className="text-muted-foreground">Catatan:</p>
            <p>{data.catatan}</p>
          </div>
        )}

        {footerNote && (
          <p className="mt-4 text-xs text-center text-muted-foreground italic">{footerNote}</p>
        )}

        {showTtd && (
          <div className="mt-8 flex justify-end">
            <div className="text-center text-xs">
              {kotaTtd && <p>{kotaTtd}, {formatDate(data.tanggal)}</p>}
              <p className="text-muted-foreground">{jabatan}</p>
              <div className="h-16" />
              <p className="font-medium border-t pt-1 min-w-[160px]">{penandatangan || "\u00A0"}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
