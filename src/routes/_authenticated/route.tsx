import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Client-side auth check handled in component
    // Server-side auth check is done via BetterAuth API
  },
  component: AuthenticatedLayout,
});

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/master/tahun-ajaran": "Tahun Ajaran",
  "/master/kelas": "Kelas",
  "/master/santri": "Santri",
  "/master/jenis-tagihan": "Jenis Tagihan",
  "/tagihan": "Tagihan",
  "/pembayaran": "Pembayaran",
  "/laporan": "Laporan & Rekap",
  "/pengaturan": "Pengaturan",
  "/pengaturan/pengguna": "Manajemen Pengguna",
  "/pengaturan/audit": "Riwayat Audit",
};

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const title = titles[path] ?? (path.startsWith("/tagihan/") ? "Detail Tagihan" : path.startsWith("/kwitansi/") ? "Kwitansi Pembayaran" : "Sistem Rekap Keuangan");

  // Redirect to login if not authenticated
  if (!loading && !session) {
    window.location.href = "/auth";
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card flex items-center gap-3 px-3 sm:px-6 sticky top-0 z-10">
            <SidebarTrigger />
            <h1 className="text-sm sm:text-base font-semibold truncate">{title}</h1>
          </header>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
