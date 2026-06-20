"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuthStore } from "@/stores/admin-auth-store";
import { Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, checkAuth, accessToken } = useAdminAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (accessToken) {
        // Always re-validate token on mount — catches expired sessions after server restart
        await checkAuth();
      }
      setIsInitializing(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      if (!pathname.startsWith("/admin/login") && !pathname.startsWith("/admin/forgot-password") && !pathname.startsWith("/admin/reset-password")) {
        router.push(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [isAuthenticated, isInitializing, router, pathname]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return <>{children}</>;
}
