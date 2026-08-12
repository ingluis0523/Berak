"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface DashboardShellProps {
  isAdmin: boolean;
  hasRole: boolean;
  permisos: string[];
  children: React.ReactNode;
}

export function DashboardShell({
  isAdmin,
  hasRole,
  permisos,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4F8]">
      <Sidebar
        isAdmin={isAdmin}
        hasRole={hasRole}
        permisos={permisos}
        isMobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
