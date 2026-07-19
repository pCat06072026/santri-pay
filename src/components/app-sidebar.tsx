import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  School,
  CalendarRange,
  ReceiptText,
  FileText,
  CreditCard,
  LogOut,
  Wallet,
  BarChart3,
  Settings,
  UsersRound,
  History,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const mainMenu = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

const keuanganMenu = [
  { title: "Tagihan", url: "/tagihan", icon: FileText },
  { title: "Pembayaran", url: "/pembayaran", icon: CreditCard },
];

const rekapMenu = [
  { title: "Rekap Santri", url: "/rekap/santri", icon: Users },
  { title: "Tunggakan", url: "/rekap/tunggakan", icon: History },
  { title: "Laporan Keuangan", url: "/laporan", icon: BarChart3 },
];

const masterMenu = [
  { title: "Tahun Ajaran", url: "/master/tahun-ajaran", icon: CalendarRange },
  { title: "Kelas", url: "/master/kelas", icon: School },
  { title: "Santri", url: "/master/santri", icon: Users },
  { title: "Jenis Tagihan", url: "/master/jenis-tagihan", icon: ReceiptText },
];

const whatsappMenu = [
  { title: "Broadcast WA", url: "/whatsapp/broadcast", icon: MessageCircle },
  { title: "Riwayat Pesan", url: "/whatsapp/riwayat", icon: History },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  const handleLogout = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Berhasil keluar");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Pesantren</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">Rekap Keuangan</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Keuangan</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {keuanganMenu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        <SidebarGroup>
          <SidebarGroupLabel>Master Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {masterMenu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>WhatsApp</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {whatsappMenu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Rekap & Laporan</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {rekapMenu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {profile?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Sistem</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPath === "/pengaturan"} tooltip="Pengaturan">
                    <Link to="/pengaturan">
                      <Settings className="h-4 w-4" />
                      <span>Pengaturan</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/pengaturan/pengguna")} tooltip="Pengguna">
                    <Link to="/pengaturan/pengguna">
                      <UsersRound className="h-4 w-4" />
                      <span>Pengguna</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/pengaturan/audit")} tooltip="Riwayat Audit">
                    <Link to="/pengaturan/audit">
                      <History className="h-4 w-4" />
                      <span>Riwayat Audit</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed ? (
          <div className="p-2 space-y-2">
            <div className="text-xs">
              <p className="font-medium truncate">{profile?.full_name}</p>
              <p className="text-sidebar-foreground/60 truncate">
                @{profile?.username}
                {profile?.role && ` · ${profile.role}`}
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Keluar
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto my-2"
            onClick={handleLogout}
            title="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
