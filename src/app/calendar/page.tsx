"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
} from "lucide-react";
import { sourceColor, sourceLabel, statusColor, statusLabel } from "@/data/mock";
import { useAuth } from "@/context/AuthContext";
import { subscribeReservations } from "@/services/reservations";
import { getDesigners } from "@/services/designers";
import type { Reservation, Designer } from "@/types";

const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 9}:00`);

// 시드 데이터가 있는 데모 날짜
const DEMO_DATE = "2025-05-25";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  // 7일 범위로 표시
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  const em = String(end.getMonth() + 1).padStart(2, "0");
  const ed = String(end.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${mm}.${dd} (${days[d.getDay()]}) ~ ${em}.${ed} (${days[end.getDay()]})`;
}

function ReservationModal({ r, onClose }: { r: Reservation; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg text-gray-900 mb-4">예약 상세</h3>
        <div className="space-y-3 text-sm">
          {[
            { label: "고객명", value: r.customerName },
            { label: "연락처", value: r.customerPhoneMasked },
            { label: "시술 메뉴", value: r.serviceName },
            { label: "담당 디자이너", value: r.designerName },
            { label: "예약 일시", value: `${r.date} ${r.time}` },
            { label: "소요시간", value: `${r.duration}분` },
            { label: "금액", value: `${r.price.toLocaleString()}원` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-24 text-gray-500">{label}</span>
              <span className="font-medium text-gray-900">{value}</span>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <span className="w-24 text-gray-500">예약 출처</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sourceColor(r.source)}`}>
              {sourceLabel(r.source)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-gray-500">상태</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
              {statusLabel(r.status)}
            </span>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">수정</button>
          <button onClick={onClose} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">닫기</button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { userData } = useAuth();
  const salonId = userData?.salonId ?? "salon1";

  const [view, setView] = useState<"일" | "주" | "월">("주");
  const [viewDate, setViewDate] = useState(DEMO_DATE);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // 실시간 예약 구독
  useEffect(() => {
    const unsub = subscribeReservations(salonId, viewDate, setReservations);
    return () => unsub();
  }, [salonId, viewDate]);

  // 디자이너 1회 로드
  useEffect(() => {
    getDesigners(salonId).then(setDesigners);
  }, [salonId]);

  const activeDesigners = designers.filter((d) => d.status === "active");

  const SOURCE_COLORS_BG: Record<string, string> = {
    naver: "bg-emerald-100 border-emerald-300",
    phone: "bg-blue-100 border-blue-300",
    visit: "bg-rose-100 border-rose-300",
    kakao: "bg-purple-100 border-purple-300",
  };

  const SOURCE_TEXT: Record<string, string> = {
    naver: "text-emerald-800",
    phone: "text-blue-800",
    visit: "text-rose-800",
    kakao: "text-purple-800",
  };

  const step = view === "일" ? 1 : 7;

  const confirmed = reservations.filter((r) => r.status === "confirmed").length;
  const pending = reservations.filter((r) => r.status === "pending").length;
  const cancelled = reservations.filter((r) => r.status === "cancelled").length;

  return (
    <AdminLayout title="예약 통합 캘린더" description="디자이너별 예약 현황을 한눈에 확인하고 관리하세요.">
      {selectedReservation && (
        <ReservationModal r={selectedReservation} onClose={() => setSelectedReservation(null)} />
      )}

      <div className="space-y-4">
        {/* Controls */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["일", "주", "월"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === v ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewDate((d) => addDays(d, -step))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-gray-900">{formatDateDisplay(viewDate)}</span>
            <button
              onClick={() => setViewDate((d) => addDays(d, step))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => setViewDate(DEMO_DATE)}
              className="text-sm text-blue-600 font-medium px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50"
            >
              오늘
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3 text-xs">
            {[
              { label: "네이버예약", color: "bg-emerald-400" },
              { label: "전화예약", color: "bg-blue-400" },
              { label: "방문예약", color: "bg-rose-400" },
              { label: "카카오", color: "bg-purple-400" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                <span className="text-gray-600">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          {/* Main calendar */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <div style={{ minWidth: 600 }}>
                {/* Header */}
                <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: `60px repeat(${Math.max(activeDesigners.length, 1)}, 1fr)` }}>
                  <div className="p-3 text-xs text-gray-400 font-medium text-center border-r border-gray-100">시간</div>
                  {activeDesigners.map((d) => (
                    <div key={d.id} className="p-3 border-r border-gray-100 last:border-r-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: d.color }}>
                          {d.profileInitial}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                          <p className="text-xs text-gray-400">{d.roleTitle}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time slots */}
                {HOURS.map((hour) => {
                  const hourNum = parseInt(hour);
                  return (
                    <div
                      key={hour}
                      className="grid border-b border-gray-50"
                      style={{ gridTemplateColumns: `60px repeat(${Math.max(activeDesigners.length, 1)}, 1fr)`, minHeight: 64 }}
                    >
                      <div className="p-2 text-xs text-gray-400 text-right pr-3 pt-2 border-r border-gray-100 flex-shrink-0">
                        {hour}
                      </div>
                      {activeDesigners.map((d) => {
                        const resInSlot = reservations.filter((r) => {
                          const h = parseInt(r.time.split(":")[0]);
                          return r.designerId === d.id && h === hourNum;
                        });
                        return (
                          <div key={d.id} className="border-r border-gray-50 last:border-r-0 p-1 relative">
                            {resInSlot.map((r) => (
                              <div
                                key={r.id}
                                onClick={() => setSelectedReservation(r)}
                                className={`rounded-lg px-2 py-1.5 mb-1 cursor-pointer border text-xs transition-opacity hover:opacity-80 ${SOURCE_COLORS_BG[r.source] ?? "bg-gray-100 border-gray-200"}`}
                              >
                                <p className={`font-semibold ${SOURCE_TEXT[r.source] ?? "text-gray-800"}`}>{r.customerName}</p>
                                <p className="text-gray-600 truncate">{r.serviceName}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-64 flex-shrink-0 space-y-4">
            {/* Today summary */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">예약 요약</h3>
              <p className="text-xs text-gray-400 mb-3">{viewDate}</p>
              {[
                { label: "전체 예약", value: `${reservations.length}건`, color: "text-gray-900" },
                { label: "확정 예약", value: `${confirmed}건`, color: "text-blue-600" },
                { label: "상담/대기", value: `${pending}건`, color: "text-yellow-600" },
                { label: "취소", value: `${cancelled}건`, color: "text-gray-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700 mb-2">예약 출처 비율</p>
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg viewBox="0 0 32 32" className="w-16 h-16 -rotate-90">
                    <circle r="14" cx="16" cy="16" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="44 44" />
                    <circle r="14" cx="16" cy="16" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="29 59" strokeDashoffset="-44" />
                    <circle r="14" cx="16" cy="16" fill="none" stroke="#f43f5e" strokeWidth="4" strokeDasharray="15 73" strokeDashoffset="-73" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900">{reservations.length}건</span>
                  </div>
                </div>
                {[
                  { label: "네이버 50%", color: "bg-emerald-400" },
                  { label: "전화 33%", color: "bg-blue-400" },
                  { label: "방문 17%", color: "bg-rose-400" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                    <div className={`w-2 h-2 rounded-full ${s.color}`} />
                    {s.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent alerts */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                <Bell size={14} className="text-blue-600" />
                최근 예약 알림
              </h3>
              <div className="space-y-3">
                {[
                  { time: "10:32", name: "이재훈 (10:30)", desc: "전화예약으로 등록되었습니다.", color: "bg-blue-50 border-blue-200" },
                  { time: "09:15", name: "한소희 (09:00)", desc: "네이버예약으로 등록되었습니다.", color: "bg-emerald-50 border-emerald-200" },
                  { time: "08:50", name: "현장 방문 (09:30)", desc: "방문 상담이 등록되었습니다.", color: "bg-rose-50 border-rose-200" },
                ].map((alert) => (
                  <div key={alert.time} className={`rounded-lg p-2.5 border text-xs ${alert.color}`}>
                    <p className="font-semibold text-gray-900">{alert.name}</p>
                    <p className="text-gray-500 mt-0.5">{alert.desc}</p>
                    <p className="text-gray-400 mt-1">{alert.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
