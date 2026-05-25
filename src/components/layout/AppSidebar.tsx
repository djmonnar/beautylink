"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarPlus,
  Users,
  Scissors,
  Menu as MenuIcon,
  Link2,
  MessageSquare,
  Shield,
  X,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/calendar", label: "예약 캘린더", icon: CalendarDays },
  { href: "/reservations/new", label: "예약 등록", icon: CalendarPlus },
  { href: "/customers", label: "고객 관리", icon: Users },
  { href: "/designers", label: "디자이너 관리", icon: Scissors },
  { href: "/services", label: "시술 메뉴 관리", icon: MenuIcon },
  { href: "/integrations/naver", label: "네이버예약 연동 준비", icon: Link2 },
  { href: "/messages", label: "문자·알림톡·노쇼", icon: MessageSquare },
  { href: "/security", label: "보안 및 권한 관리", icon: Shield },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AppSidebar({ open, onClose }: Props) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          w-64 bg-[#1e2a4a] text-white
          transition-transform duration-300
          lg:static lg:translate-x-0 lg:flex-shrink-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">뷰티링크</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Store info */}
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs text-white/50 mb-1">현재 매장</p>
          <p className="text-sm font-semibold text-white leading-tight">뷰티링크 헤어 강남점</p>
          <p className="text-xs text-white/50 mt-0.5">프로 플랜 이용 중</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors duration-150
                      ${active
                        ? "bg-blue-600 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                      }
                    `}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="leading-tight">{label}</span>
                    {href === "/integrations/naver" && (
                      <span className="ml-auto text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full">
                        준비중
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">
            ← 랜딩페이지로
          </Link>
        </div>
      </aside>
    </>
  );
}
