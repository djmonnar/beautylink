"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, CalendarPlus, Users, Menu } from "lucide-react";

interface Props {
  onMoreClick: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  primary?: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/dashboard",        label: "대시보드", icon: LayoutDashboard },
  { href: "/calendar",         label: "캘린더",   icon: CalendarDays },
  { href: "/reservations/new", label: "예약등록", icon: CalendarPlus, primary: true },
  { href: "/customers",        label: "고객",     icon: Users },
];

export default function MobileBottomNav({ onMoreClick }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center h-14">
        {ITEMS.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors ${
                active ? "text-blue-600" : "text-gray-400"
              }`}
            >
              {primary ? (
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${
                    active ? "bg-blue-700" : "bg-blue-600"
                  }`}
                >
                  <Icon size={20} className="text-white" />
                </div>
              ) : (
                <Icon size={22} />
              )}
              <span className={`text-[10px] font-medium ${primary ? "text-blue-600" : ""}`}>
                {label}
              </span>
            </Link>
          );
        })}

        {/* 더보기 → 사이드바 열기 */}
        <button
          onClick={onMoreClick}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-gray-400 active:text-gray-600 transition-colors"
        >
          <Menu size={22} />
          <span className="text-[10px] font-medium">더보기</span>
        </button>
      </div>
    </nav>
  );
}
