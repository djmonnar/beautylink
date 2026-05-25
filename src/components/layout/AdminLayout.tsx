"use client";

import { useState } from "react";
import AppSidebar from "./AppSidebar";
import TopHeader from "./TopHeader";

interface Props {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function AdminLayout({ title, description, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          description={description}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
