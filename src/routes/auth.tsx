import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Building2, KeyRound, User as UserIcon } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi").max(64),
  password: z.string().min(1, "Password wajib diisi").max(128),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — Sistem Rekap Keuangan Pesantren" },
      { name: "description", content: "Halaman masuk pengguna sistem rekap keuangan pondok pesantren." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    // If already signed in, redirect to dashboard.
    if (typeof window === "undefined") return;
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading, signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && session) {
      navigate({ to: "/" });
    }
  }, [session, authLoading, navigate]);

  const onSubmit = async (values: LoginForm) => {
    setSubmitting(true);
    try {
      const result = await signIn({
        username: values.username,
        password: values.password,
      });

      if (!result.success) {
        toast.error("Login gagal", {
          description: result.error || "Username atau password salah.",
        });
        return;
      }

      toast.success("Berhasil masuk");
      navigate({ to: "/" });
    } catch (err) {
      toast.error("Login gagal", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-primary/10 via-background to-accent/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary/10 via-background to-accent/30 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center">
            Sistem Rekap Keuangan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Pondok Pesantren</p>
        </div>

        <Card className="border-border/60 shadow-xl shadow-primary/5">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold">Masuk ke akun</h2>
            <p className="text-sm text-muted-foreground">
              Gunakan username dan password yang telah diberikan.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    autoComplete="username"
                    placeholder="admin"
                    className="pl-9"
                    {...register("username")}
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-9"
                    {...register("password")}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Masuk..." : "Masuk"}
              </Button>

              <div className="text-xs text-muted-foreground pt-2 border-t border-border/60">
                <p className="font-medium mb-1">Akun default:</p>
                <p>
                  Username: <span className="font-mono">admin</span> · Password:{" "}
                  <span className="font-mono">admin123</span>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Sistem Rekap Keuangan Pondok Pesantren
        </p>
      </div>
    </div>
  );
}
