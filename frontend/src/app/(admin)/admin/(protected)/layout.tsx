"use client";

import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { GradientMesh } from "@/components/effects/gradient-mesh";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <GradientMesh />
        <AdminSidebar />
        <div
          className={cn(
            "flex flex-col min-h-screen transition-[margin] duration-300",
            sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"
          )}
        >
          <AdminHeader />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
