"use client";

import { Bell, Menu, ChevronDown } from "lucide-react";
import Image from "next/image";

interface Props {
  onMenuClick: () => void;
  title: string;
  description?: string;
}

export default function TopHeader({ onMenuClick, title, description }: Props) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
      >
        <Menu size={20} />
      </button>

      {/* Mobile logo */}
      <div className="lg:hidden flex items-center">
        <Image src="/logo-icon.png" alt="뷰티링크" width={32} height={32} className="object-contain" />
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
        {description && (
          <p className="text-xs text-gray-500 truncate hidden sm:block">{description}</p>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notification */}
        <button className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Store selector */}
        <button className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">
          <span className="text-gray-700 font-medium">뷰티링크 헤어 강남점</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            김
          </div>
          <span className="hidden md:block text-sm font-medium text-gray-700">김지연 원장</span>
        </div>
      </div>
    </header>
  );
}
