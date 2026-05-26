"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import AppSidebar from "./AppSidebar";
import TopHeader from "./TopHeader";
import MobileBottomNav from "./MobileBottomNav";
import { useAuth } from "@/context/AuthContext";

interface Props {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function AdminLayout({ title, description, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, firebaseReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Firebase 설정된 경우에만 인증 체크
    if (!loading && firebaseReady && !user) {
      router.replace("/login");
    }
  }, [user, loading, firebaseReady, router]);

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Firebase 설정됐는데 로그인 안 된 경우 — redirect 전 빈 화면
  if (firebaseReady && !user) {
    return null;
  }

  return (
    <div className="flex h-dvh bg-gray-50 overflow-hidden">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          description={description}
        />
        {/* pb-20 reserves space for the fixed mobile bottom nav (h-14 + safe-area) */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
      </div>
      {/* Mobile bottom navigation — fixed, rendered outside scroll flow */}
      <MobileBottomNav onMoreClick={() => setSidebarOpen(true)} />
    </div>
  );
}
