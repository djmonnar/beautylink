"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { sourceColor, sourceLabel, statusColor, statusLabel } from "@/data/mock";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeReservations,
  subscribeReservationsWeek,
  changeReservationStatus,
  getReservationsByDateRange,
} from "@/services/reservations";
import { getDesigners } from "@/services/designers";
import { isDesignerWorkingOnDate } from "@/lib/designerSchedule";
import type { Reservation, Designer, ReservationStatus, PermissionRole, UserRole } from "@/types";
import type { UserData } from "@/context/AuthContext";

// ── 상수 ──────────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 9}:00`);
const DEMO_DATE = "2025-05-25";
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
// 월간 그리드 헤더: 월~일
const WEEK_HEADER = ["월", "화", "수", "목", "금", "토", "일"];

const ROLE_MAP: Record<UserRole, PermissionRole> = {
  owner: "원장",
  manager: "매니저",
  designer: "디자이너",
};

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  noShow:    "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_ACTIONS: {
  status: ReservationStatus;
  label: string;
  activeColor: string;
  btnColor: string;
}[] = [
  { status: "confirmed", label: "확정 처리", activeColor: "ring-blue-500",   btnColor: "bg-blue-600 hover:bg-blue-700 text-white" },
  { status: "completed", label: "완료 처리", activeColor: "ring-green-500",  btnColor: "bg-green-600 hover:bg-green-700 text-white" },
  { status: "noShow",    label: "노쇼 처리", activeColor: "ring-red-500",    btnColor: "bg-red-600 hover:bg-red-700 text-white" },
  { status: "cancelled", label: "취소 처리", activeColor: "ring-gray-400",   btnColor: "bg-gray-600 hover:bg-gray-700 text-white" },
  { status: "pending",   label: "대기 처리", activeColor: "ring-yellow-400", btnColor: "bg-yellow-500 hover:bg-yellow-600 text-white" },
];

const CANCEL_REASONS = ["고객 요청", "일정 변경", "매장 사정", "무응답", "기타"];

// ── 날짜 헬퍼 ─────────────────────────────────────────────────────────────────

/** Date → "YYYY-MM-DD" (로컬 타임존 안전) */
function dateToStr(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return dateToStr(d);
}

/** 해당 날짜가 속한 주 월요일 */
function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return dateToStr(d);
}

/** 월요일~일요일 7개 날짜 배열 */
function getWeekDates(dateStr: string): string[] {
  const monday = getWeekMonday(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** "2025.05.25 (일)" */
function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} (${DAY_NAMES[d.getDay()]})`;
}

/** "2025.05.19 (월) ~ 05.25 (일)" */
function formatWeekRange(weekDates: string[]): string {
  const first = new Date(weekDates[0] + "T00:00:00");
  const last  = new Date(weekDates[6] + "T00:00:00");
  const y   = first.getFullYear();
  const mm1 = String(first.getMonth()+1).padStart(2,"0");
  const dd1 = String(first.getDate()).padStart(2,"0");
  const mm2 = String(last.getMonth()+1).padStart(2,"0");
  const dd2 = String(last.getDate()).padStart(2,"0");
  return `${y}.${mm1}.${dd1} (${DAY_NAMES[first.getDay()]}) ~ ${mm2}.${dd2} (${DAY_NAMES[last.getDay()]})`;
}

/** "05.25 (일)" */
function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} (${DAY_NAMES[d.getDay()]})`;
}

// ── 월간 뷰 헬퍼 ──────────────────────────────────────────────────────────────

/** "2026년 5월" */
function formatMonthDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth()+1}월`;
}

/** "5.14 (목)" */
function formatMonthDayHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth()+1}.${String(d.getDate()).padStart(2,"0")} (${DAY_NAMES[d.getDay()]})`;
}

interface CalendarCell {
  dateStr: string;
  isCurrentMonth: boolean;
  day: number;
  dow: number; // 0=일~6=토
}

/**
 * 월간 달력 그리드 42셀 (6주 × 7일, 월요일 시작).
 * 이전달/다음달 날짜는 isCurrentMonth=false.
 */
function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstDow = new Date(year, month, 1).getDay(); // 0=일
  const startOffset = firstDow === 0 ? -6 : 1 - firstDow;
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year, month, 1 + startOffset + i);
    return {
      dateStr: dateToStr(d),
      isCurrentMonth: d.getMonth() === month,
      day: d.getDate(),
      dow: d.getDay(),
    };
  });
}

// ── 예약 상세 모달 ─────────────────────────────────────────────────────────────

function ReservationModal({
  r, salonId, userData, onClose,
}: {
  r: Reservation; salonId: string; userData: UserData | null; onClose: () => void;
}) {
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("고객 요청");
  const [changing, setChanging] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const userRole = userData?.role ?? "designer";
  const isOM = userRole === "owner" || userRole === "manager";
  const isOwnDesigner = userRole === "designer" && r.designerId === userData?.designerId;

  function canDoAction(targetStatus: ReservationStatus): boolean {
    if (isOM) return true;
    if (isOwnDesigner && (targetStatus === "completed" || targetStatus === "noShow")) return true;
    return false;
  }

  async function handleStatusChange(newStatus: ReservationStatus, reason?: string) {
    if (!canDoAction(newStatus)) return;
    setChanging(true); setMsg(null);
    try {
      await changeReservationStatus(salonId, r, newStatus, {
        cancelReason: reason,
        updatedBy: userData
          ? { uid: userData.uid, name: userData.name, role: ROLE_MAP[userData.role] }
          : undefined,
      });
      setMsg({ ok: true, text: "상태가 변경되었습니다." });
      setShowCancelForm(false);
    } catch {
      setMsg({ ok: false, text: "상태 변경에 실패했습니다." });
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90dvh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-lg text-gray-900">예약 상세</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-5">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs text-gray-400 flex-shrink-0">현재 상태</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
            </div>
            {[
              { label: "고객명",        value: r.customerName },
              { label: "연락처",        value: r.customerPhoneMasked },
              { label: "담당 디자이너", value: r.designerName },
              { label: "시술 메뉴",     value: r.serviceName },
              { label: "예약 일시",     value: `${r.date} ${r.time}` },
              { label: "소요시간",      value: `${r.duration}분` },
              { label: "금액",          value: `${r.price.toLocaleString()}원` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="w-24 text-xs text-gray-400 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-sm font-medium text-gray-900 leading-snug">{value}</span>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs text-gray-400 flex-shrink-0">예약 출처</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sourceColor(r.source)}`}>{sourceLabel(r.source)}</span>
            </div>
            {r.note && (
              <div className="flex gap-3">
                <span className="w-24 text-xs text-gray-400 flex-shrink-0 pt-0.5">요청사항</span>
                <span className="text-sm text-gray-700 leading-relaxed">{r.note}</span>
              </div>
            )}
            {r.cancelReason && (
              <div className="flex items-center gap-3">
                <span className="w-24 text-xs text-gray-400 flex-shrink-0">취소 사유</span>
                <span className="text-sm text-red-600 font-medium">{r.cancelReason}</span>
              </div>
            )}
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">상태 변경</h4>
              {!isOM && isOwnDesigner && (
                <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">완료·노쇼만 처리 가능</span>
              )}
              {!isOM && !isOwnDesigner && (
                <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">권한 없음</span>
              )}
            </div>
            {msg && (
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs mb-3 border ${msg.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                {msg.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                {msg.text}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {STATUS_ACTIONS.map(({ status, label, activeColor, btnColor }) => {
                const isCurrent = r.status === status;
                const hasPerm   = canDoAction(status);
                return (
                  <button key={status}
                    onClick={() => {
                      if (!hasPerm || changing) return;
                      if (status === "cancelled") { setShowCancelForm(true); setMsg(null); }
                      else handleStatusChange(status);
                    }}
                    disabled={isCurrent || !hasPerm || changing}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${isCurrent ? `${btnColor} ring-2 ring-offset-1 ${activeColor}` : !hasPerm ? "bg-gray-100 text-gray-300 cursor-not-allowed" : `${btnColor} disabled:opacity-50`} disabled:cursor-not-allowed`}
                  >
                    {changing ? <Loader2 size={11} className="animate-spin" /> : isCurrent ? <CheckCircle size={11} /> : null}
                    {label}
                  </button>
                );
              })}
            </div>
            {showCancelForm && (
              <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2.5">취소 사유 선택</p>
                <div className="space-y-2 mb-4">
                  {CANCEL_REASONS.map((reason) => (
                    <label key={reason} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="radio" name="cancelReason" value={reason} checked={cancelReason === reason} onChange={() => setCancelReason(reason)} className="accent-red-600" />
                      <span className="text-sm text-gray-700">{reason}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowCancelForm(false); setMsg(null); }} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors">돌아가기</button>
                  <button onClick={() => handleStatusChange("cancelled", cancelReason)} disabled={changing} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5">
                    {changing ? <><Loader2 size={11} className="animate-spin" />처리 중...</> : "취소 처리 확인"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">닫기</button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 캘린더 페이지 ─────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { userData } = useAuth();
  const salonId = userData?.salonId ?? null;

  // ── 뷰 & 날짜 ─────────────────────────────────────────────────────────────
  const [view, setView] = useState<"일" | "주" | "월">("주");
  const [viewDate, setViewDate] = useState(DEMO_DATE);

  // ── 일/주간 예약 ─────────────────────────────────────────────────────────
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // ── 월간 예약 ─────────────────────────────────────────────────────────────
  const [monthReservations, setMonthReservations] = useState<Reservation[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [selectedMonthDate, setSelectedMonthDate] = useState<string | null>(null);

  // ── 디자이너 ─────────────────────────────────────────────────────────────
  const [designers, setDesigners] = useState<Designer[]>([]);

  // ── 선택된 예약 모달 ──────────────────────────────────────────────────────
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const selectedReservation = selectedReservationId
    ? (reservations.find((r) => r.id === selectedReservationId)
      ?? monthReservations.find((r) => r.id === selectedReservationId)
      ?? null)
    : null;

  // ── 모바일 주간 선택 날짜 ─────────────────────────────────────────────────
  const [mobileWeekDay, setMobileWeekDay] = useState(DEMO_DATE);

  const weekDates = getWeekDates(viewDate);

  // 주간 뷰 전환 시 mobileWeekDay 동기화
  useEffect(() => {
    if (view === "주") setMobileWeekDay(viewDate);
  }, [view, viewDate]);

  // 월간 뷰 전환 시 선택 초기화
  useEffect(() => {
    if (view !== "월") setSelectedMonthDate(null);
  }, [view]);

  // ── 일/주 실시간 구독 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!salonId || view === "월") return;
    if (view === "주") {
      const wd = getWeekDates(viewDate);
      const unsub = subscribeReservationsWeek(salonId, wd, setReservations);
      return () => unsub();
    } else {
      const unsub = subscribeReservations(salonId, viewDate, setReservations);
      return () => unsub();
    }
  }, [salonId, viewDate, view]);

  // ── 월간 예약 로드 ────────────────────────────────────────────────────────
  const loadMonthReservations = useCallback(async () => {
    if (!salonId) return;
    const d     = new Date(viewDate + "T00:00:00");
    const year  = d.getFullYear();
    const month = d.getMonth();
    const startDate = dateToStr(new Date(year, month, 1));
    const endDate   = dateToStr(new Date(year, month + 1, 0));
    setMonthLoading(true);
    try {
      const data = await getReservationsByDateRange(salonId, startDate, endDate);
      setMonthReservations(data);
    } catch {
      setMonthReservations([]);
    } finally {
      setMonthLoading(false);
    }
  }, [salonId, viewDate]);

  useEffect(() => {
    if (view === "월" && salonId) loadMonthReservations();
  }, [view, salonId, viewDate, loadMonthReservations]);

  // ── 디자이너 1회 로드 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (salonId) getDesigners(salonId).then(setDesigners);
  }, [salonId]);

  const activeDesigners = designers.filter((d) => d.status !== "inactive");

  function isDesignerOff(designer: Designer, dateStr: string): boolean {
    if (designer.status === "off") return true;
    return !isDesignerWorkingOnDate(designer, new Date(dateStr + "T00:00:00"));
  }

  // ── 출처 색상 ─────────────────────────────────────────────────────────────
  const SOURCE_COLORS_BG: Record<string, string> = {
    naver: "bg-emerald-50 border-emerald-300",
    phone: "bg-blue-50 border-blue-300",
    visit: "bg-rose-50 border-rose-300",
    kakao: "bg-purple-50 border-purple-300",
  };
  const SOURCE_TEXT: Record<string, string> = {
    naver: "text-emerald-800",
    phone: "text-blue-800",
    visit: "text-rose-800",
    kakao: "text-purple-800",
  };
  const SOURCE_DOT: Record<string, string> = {
    naver: "bg-emerald-400",
    phone: "bg-blue-400",
    visit: "bg-rose-400",
    kakao: "bg-purple-400",
  };

  // ── 네비게이션 ────────────────────────────────────────────────────────────
  function navigatePrev() {
    if (view === "월") {
      const d = new Date(viewDate + "T00:00:00");
      d.setDate(1);
      d.setMonth(d.getMonth() - 1);
      setViewDate(dateToStr(d));
      setSelectedMonthDate(null);
    } else if (view === "주") {
      setViewDate(addDays(getWeekMonday(viewDate), -7));
    } else {
      setViewDate((d) => addDays(d, -1));
    }
  }

  function navigateNext() {
    if (view === "월") {
      const d = new Date(viewDate + "T00:00:00");
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      setViewDate(dateToStr(d));
      setSelectedMonthDate(null);
    } else if (view === "주") {
      setViewDate(addDays(getWeekMonday(viewDate), 7));
    } else {
      setViewDate((d) => addDays(d, 1));
    }
  }

  // ── 월간 통계 ─────────────────────────────────────────────────────────────
  const monthStats = useMemo(() => {
    const completed = monthReservations.filter((r) => r.status === "completed");
    return {
      total:    monthReservations.length,
      completed: completed.length,
      revenue:   completed.reduce((s, r) => s + (r.price ?? 0), 0),
      noShow:    monthReservations.filter((r) => r.status === "noShow").length,
      cancelled: monthReservations.filter((r) => r.status === "cancelled").length,
      remaining: monthReservations.filter((r) => r.status === "confirmed" || r.status === "pending").length,
    };
  }, [monthReservations]);

  // ── 일/주 통계 ────────────────────────────────────────────────────────────
  const confirmedCount = reservations.filter((r) => r.status === "confirmed").length;
  const pendingCount   = reservations.filter((r) => r.status === "pending").length;
  const completedCount = reservations.filter((r) => r.status === "completed").length;
  const noShowCount    = reservations.filter((r) => r.status === "noShow").length;
  const cancelledCount = reservations.filter((r) => r.status === "cancelled").length;

  // 주간 모바일: 선택된 날 예약
  const dayRes = view === "주"
    ? reservations.filter((r) => r.date === mobileWeekDay)
    : reservations;

  // ── 월간 달력 데이터 ──────────────────────────────────────────────────────
  const monthViewDate = new Date(viewDate + "T00:00:00");
  const monthYear  = monthViewDate.getFullYear();
  const monthMonth = monthViewDate.getMonth();
  const calendarGrid = useMemo(
    () => buildMonthGrid(monthYear, monthMonth),
    [monthYear, monthMonth],
  );

  // 날짜별 예약 맵
  const monthResByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    for (const r of monthReservations) {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    }
    return map;
  }, [monthReservations]);

  // 선택된 날 예약
  const selectedDateRes = useMemo(
    () => (selectedMonthDate ? (monthResByDate[selectedMonthDate] ?? []) : []),
    [selectedMonthDate, monthResByDate],
  );

  // ── 모바일 예약 카드 ──────────────────────────────────────────────────────
  const mobileReservationCard = (r: Reservation) => (
    <div key={r.id} onClick={() => setSelectedReservationId(r.id)}
      className="bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 cursor-pointer active:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 min-w-0">
          <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
            <span className="text-sm font-bold text-gray-900 tabular-nums">{r.time}</span>
            <div className={`w-2 h-2 rounded-full ${SOURCE_DOT[r.source] ?? "bg-gray-300"}`} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight">{r.customerName}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{r.serviceName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{r.designerName} · {r.duration}분</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-500"}`}>{statusLabel(r.status)}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sourceColor(r.source)}`}>{sourceLabel(r.source)}</span>
        </div>
      </div>
    </div>
  );

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="예약 통합 캘린더" description="디자이너별 예약 현황을 한눈에 확인하고 관리하세요.">
      {/* salonId 가드 */}
      {!salonId ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <p className="text-amber-800 font-semibold mb-1">매장 정보가 연결되지 않았습니다.</p>
          <p className="text-sm text-amber-600">users/{userData?.uid ?? "—"}.salonId를 확인해주세요.</p>
        </div>
      ) : (
        <>
          {selectedReservation && (
            <ReservationModal r={selectedReservation} salonId={salonId} userData={userData} onClose={() => setSelectedReservationId(null)} />
          )}

          <div className="space-y-4">
            {/* ── 컨트롤 바 ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
              {/* 뷰 전환 */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {(["일", "주", "월"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      view === v ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* 날짜 네비게이션 */}
              <div className="flex items-center gap-2">
                <button onClick={navigatePrev} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-semibold text-gray-900 min-w-0">
                  {view === "월" ? (
                    formatMonthDisplay(viewDate)
                  ) : view === "주" ? (
                    <>
                      <span className="hidden sm:inline">{formatWeekRange(weekDates)}</span>
                      <span className="sm:hidden">{formatDateShort(weekDates[0])} ~ {formatDateShort(weekDates[6])}</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">{formatDateDisplay(viewDate)}</span>
                      <span className="sm:hidden">{formatDateShort(viewDate)}</span>
                    </>
                  )}
                </span>
                <button onClick={navigateNext} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
                  <ChevronRight size={18} />
                </button>
                <button onClick={() => { setViewDate(DEMO_DATE); setSelectedMonthDate(null); }}
                  className="text-sm text-blue-600 font-medium px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50"
                >
                  오늘
                </button>
                {/* 월간: 새로고침 버튼 */}
                {view === "월" && (
                  <button onClick={loadMonthReservations} disabled={monthLoading}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-40"
                    title="새로고침"
                  >
                    <RefreshCw size={16} className={monthLoading ? "animate-spin" : ""} />
                  </button>
                )}
              </div>

              {/* 범례 */}
              <div className="ml-auto items-center gap-3 text-xs hidden lg:flex">
                {[
                  { label: "네이버예약", color: "bg-emerald-400" },
                  { label: "전화예약",   color: "bg-blue-400" },
                  { label: "방문예약",   color: "bg-rose-400" },
                  { label: "카카오",     color: "bg-purple-400" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                    <span className="text-gray-600">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                모바일 (md 미만)
            ══════════════════════════════════════════════════════ */}

            {/* ── 모바일 월간 뷰 ──────────────────────────────────── */}
            {view === "월" && (
              <div className="md:hidden space-y-3">
                {/* 월간 통계 스트립 */}
                <div className="flex items-center gap-3 flex-wrap text-xs px-1">
                  {[
                    { label: "전체",  value: monthStats.total,     color: "text-gray-700" },
                    { label: "완료",  value: monthStats.completed, color: "text-green-600" },
                    { label: "노쇼",  value: monthStats.noShow,    color: "text-red-500" },
                    { label: "취소",  value: monthStats.cancelled, color: "text-gray-400" },
                    { label: "남은",  value: monthStats.remaining, color: "text-blue-600" },
                  ].map((s) => (
                    <span key={s.label} className={`font-medium ${s.color}`}>
                      {s.label} <span className="font-bold">{s.value}</span>
                    </span>
                  ))}
                  <span className="ml-auto font-bold text-green-700">
                    {(monthStats.revenue / 10000).toFixed(0)}만원
                  </span>
                </div>

                {/* 미니 캘린더 그리드 */}
                {monthLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* 요일 헤더 */}
                    <div className="grid grid-cols-7 border-b border-gray-100">
                      {WEEK_HEADER.map((d, i) => (
                        <div key={d} className={`py-2 text-center text-[11px] font-semibold ${i === 5 ? "text-blue-500" : i === 6 ? "text-red-500" : "text-gray-500"}`}>
                          {d}
                        </div>
                      ))}
                    </div>
                    {/* 날짜 셀 */}
                    <div className="grid grid-cols-7">
                      {calendarGrid.map((cell) => {
                        const count = monthResByDate[cell.dateStr]?.length ?? 0;
                        const isToday = cell.dateStr === DEMO_DATE;
                        const isSelected = cell.dateStr === selectedMonthDate;
                        const isSat = cell.dow === 6;
                        const isSun = cell.dow === 0;
                        return (
                          <button key={cell.dateStr}
                            onClick={() => setSelectedMonthDate(
                              selectedMonthDate === cell.dateStr ? null : cell.dateStr
                            )}
                            className={`flex flex-col items-center py-2 border-b border-gray-50 transition-colors ${isSelected ? "bg-blue-600" : isToday ? "bg-blue-50" : "hover:bg-gray-50"}`}
                          >
                            <span className={`text-sm font-bold leading-tight ${
                              isSelected ? "text-white"
                              : !cell.isCurrentMonth ? "text-gray-300"
                              : isToday ? "text-blue-700"
                              : isSun ? "text-red-500"
                              : isSat ? "text-blue-500"
                              : "text-gray-800"
                            }`}>
                              {cell.day}
                            </span>
                            <span className={`text-[9px] h-3 leading-3 mt-0.5 font-semibold ${
                              isSelected ? "text-blue-200"
                              : count > 0 ? "text-blue-500"
                              : "text-transparent"
                            }`}>
                              {count > 0 ? count : "·"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 선택된 날 예약 리스트 */}
                {selectedMonthDate && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700 px-1">
                      {formatMonthDayHeader(selectedMonthDate)}
                      <span className="ml-2 text-xs font-normal text-gray-400">{selectedDateRes.length}건</span>
                    </p>
                    {selectedDateRes.length === 0 ? (
                      <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
                        <CalendarDays size={24} className="mx-auto mb-2 text-gray-200" />
                        <p className="text-sm text-gray-400">이 날짜의 예약이 없습니다.</p>
                      </div>
                    ) : (
                      selectedDateRes.slice().sort((a, b) => a.time.localeCompare(b.time)).map(mobileReservationCard)
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── 모바일 주간 뷰 ──────────────────────────────────── */}
            {view === "주" && (
              <div className="md:hidden space-y-3">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">{formatDateShort(mobileWeekDay)}</span>
                  {[
                    { label: "전체", value: dayRes.length,                                         color: "text-gray-700" },
                    { label: "확정", value: dayRes.filter(r=>r.status==="confirmed").length,        color: "text-blue-600" },
                    { label: "완료", value: dayRes.filter(r=>r.status==="completed").length,        color: "text-green-600" },
                    { label: "대기", value: dayRes.filter(r=>r.status==="pending").length,          color: "text-yellow-600" },
                    { label: "노쇼", value: dayRes.filter(r=>r.status==="noShow").length,           color: "text-red-500" },
                  ].map((s) => (
                    <span key={s.label} className={`font-medium ${s.color}`}>{s.label} <span className="font-bold">{s.value}</span></span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {weekDates.map((dateStr) => {
                    const d = new Date(dateStr + "T00:00:00");
                    const isSelected = mobileWeekDay === dateStr;
                    const cnt = reservations.filter((r) => r.date === dateStr).length;
                    const dow = d.getDay();
                    return (
                      <button key={dateStr} onClick={() => setMobileWeekDay(dateStr)}
                        className={`flex-1 flex flex-col items-center py-2 rounded-xl border font-medium transition-colors ${isSelected ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 hover:border-blue-300"}`}
                      >
                        <span className={`text-[9px] leading-none mb-0.5 ${isSelected ? "text-blue-200" : dow===0 ? "text-red-400" : dow===6 ? "text-blue-400" : "text-gray-400"}`}>{DAY_NAMES[dow]}</span>
                        <span className={`text-sm font-bold leading-tight ${isSelected ? "text-white" : dow===0 ? "text-red-500" : dow===6 ? "text-blue-500" : "text-gray-800"}`}>{d.getDate()}</span>
                        <span className={`text-[9px] h-3 leading-3 mt-0.5 font-semibold ${isSelected ? "text-blue-200" : "text-blue-500"}`}>{cnt > 0 ? cnt : ""}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {dayRes.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
                      <p className="text-sm text-gray-400">이 날짜의 예약이 없습니다.</p>
                    </div>
                  ) : (
                    dayRes.slice().sort((a,b)=>a.time.localeCompare(b.time)).map(mobileReservationCard)
                  )}
                </div>
              </div>
            )}

            {/* ── 모바일 일별 뷰 ─────────────────────────────────── */}
            {view === "일" && (
              <>
                <div className="md:hidden flex items-center gap-2 flex-wrap text-xs">
                  {[
                    { label: "전체", value: reservations.length, color: "text-gray-700" },
                    { label: "확정", value: confirmedCount,       color: "text-blue-600" },
                    { label: "완료", value: completedCount,       color: "text-green-600" },
                    { label: "대기", value: pendingCount,         color: "text-yellow-600" },
                    { label: "노쇼", value: noShowCount,          color: "text-red-500" },
                  ].map((s) => (
                    <span key={s.label} className={`font-medium ${s.color}`}>{s.label} <span className="font-bold">{s.value}</span></span>
                  ))}
                </div>
                <div className="md:hidden space-y-2">
                  {reservations.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
                      <p className="text-sm text-gray-400">이 날짜의 예약이 없습니다.</p>
                    </div>
                  ) : (
                    reservations.slice().sort((a,b)=>a.time.localeCompare(b.time)).map(mobileReservationCard)
                  )}
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════
                데스크탑 (md 이상)
            ══════════════════════════════════════════════════════ */}
            <div className="hidden md:flex gap-4">

              {/* ── 메인 캘린더 영역 ────────────────────────────── */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-w-0">

                {/* ════ 월간 그리드 ════ */}
                {view === "월" && (
                  monthLoading ? (
                    <div className="flex items-center justify-center py-24">
                      <Loader2 size={32} className="animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <div>
                      {/* 요일 헤더 */}
                      <div className="grid grid-cols-7 border-b border-gray-100">
                        {WEEK_HEADER.map((d, i) => (
                          <div key={d} className={`py-2.5 text-center text-xs font-semibold border-r border-gray-50 last:border-r-0 ${i === 5 ? "text-blue-500" : i === 6 ? "text-red-500" : "text-gray-500"}`}>
                            {d}
                          </div>
                        ))}
                      </div>

                      {/* 날짜 셀 6주 */}
                      <div className="grid grid-cols-7">
                        {calendarGrid.map((cell) => {
                          const dayReservations = monthResByDate[cell.dateStr] ?? [];
                          const isToday    = cell.dateStr === DEMO_DATE;
                          const isSelected = cell.dateStr === selectedMonthDate;
                          const isSat = cell.dow === 6;
                          const isSun = cell.dow === 0;
                          const preview = dayReservations.slice(0, 3);
                          const extra   = dayReservations.length - preview.length;

                          return (
                            <div key={cell.dateStr}
                              onClick={() => setSelectedMonthDate(
                                selectedMonthDate === cell.dateStr ? null : cell.dateStr
                              )}
                              className={`border-r border-b border-gray-50 last:border-r-0 p-1.5 cursor-pointer transition-colors min-h-[100px] ${
                                isSelected ? "bg-blue-50 ring-1 ring-inset ring-blue-400"
                                : isToday   ? "bg-blue-50/40"
                                : "hover:bg-gray-50"
                              }`}
                            >
                              {/* 날짜 숫자 + 건수 */}
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm font-bold leading-none ${
                                  !cell.isCurrentMonth ? "text-gray-300"
                                  : isToday   ? "text-blue-600"
                                  : isSun     ? "text-red-500"
                                  : isSat     ? "text-blue-500"
                                  : "text-gray-800"
                                }`}>
                                  {isToday ? (
                                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                      {cell.day}
                                    </span>
                                  ) : cell.day}
                                </span>
                                {dayReservations.length > 0 && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                    isSelected ? "bg-blue-200 text-blue-800" : "bg-gray-100 text-gray-600"
                                  }`}>
                                    {dayReservations.length}건
                                  </span>
                                )}
                              </div>

                              {/* 예약 미리보기 (최대 3건) */}
                              {cell.isCurrentMonth && preview.map((r) => (
                                <div key={r.id}
                                  onClick={(e) => { e.stopPropagation(); setSelectedReservationId(r.id); }}
                                  className={`text-[10px] truncate rounded px-1.5 py-0.5 mb-0.5 border cursor-pointer hover:opacity-80 ${SOURCE_COLORS_BG[r.source] ?? "bg-gray-50 border-gray-200"}`}
                                >
                                  <span className={`font-semibold ${SOURCE_TEXT[r.source] ?? "text-gray-700"}`}>
                                    {r.time}
                                  </span>
                                  <span className="text-gray-600 ml-1">{r.customerName}</span>
                                </div>
                              ))}
                              {extra > 0 && (
                                <p className="text-[10px] text-blue-500 font-medium mt-0.5 px-1">
                                  +{extra}건 더보기
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}

                {/* ════ 주간 그리드 ════ */}
                {view === "주" && (
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: 700 }}>
                      <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
                        {weekDates.map((dateStr) => {
                          const d = new Date(dateStr + "T00:00:00");
                          const cnt = reservations.filter((r) => r.date === dateStr).length;
                          const isToday = dateStr === DEMO_DATE;
                          const dow = d.getDay();
                          return (
                            <div key={dateStr} className={`p-3 border-r border-gray-100 last:border-r-0 text-center ${isToday ? "bg-blue-50" : ""}`}>
                              <p className={`text-xs font-semibold ${isToday ? "text-blue-600" : dow===0 ? "text-red-500" : dow===6 ? "text-blue-500" : "text-gray-700"}`}>
                                {d.getMonth()+1}.{String(d.getDate()).padStart(2,"0")} ({DAY_NAMES[dow]})
                              </p>
                              {cnt > 0 ? (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${isToday ? "bg-blue-200 text-blue-800" : "bg-gray-100 text-gray-600"}`}>{cnt}건</span>
                              ) : (
                                <span className="text-[10px] text-gray-300 mt-1 inline-block">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", minHeight: 400 }}>
                        {weekDates.map((dateStr) => {
                          const isToday = dateStr === DEMO_DATE;
                          const sorted = reservations.filter((r) => r.date === dateStr).sort((a,b)=>a.time.localeCompare(b.time));
                          return (
                            <div key={dateStr} className={`border-r border-gray-50 last:border-r-0 p-1.5 ${isToday ? "bg-blue-50/30" : ""}`}>
                              {sorted.length === 0 ? (
                                <p className="text-[10px] text-gray-300 text-center pt-6">예약 없음</p>
                              ) : sorted.map((r) => (
                                <div key={r.id} onClick={() => setSelectedReservationId(r.id)}
                                  className={`rounded-lg px-2 py-1.5 mb-1.5 cursor-pointer border text-xs transition-all hover:opacity-80 hover:shadow-sm ${SOURCE_COLORS_BG[r.source] ?? "bg-gray-100 border-gray-200"}`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <p className={`font-semibold truncate ${SOURCE_TEXT[r.source] ?? "text-gray-800"}`}>{r.time} {r.customerName}</p>
                                    <span className={`text-[9px] px-1 py-0.5 rounded font-semibold flex-shrink-0 ${STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-500"}`}>{statusLabel(r.status)}</span>
                                  </div>
                                  <p className="text-gray-500 truncate text-[10px]">{r.designerName} · {r.serviceName}</p>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ════ 일별 그리드 ════ */}
                {view === "일" && (
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: 600 }}>
                      <div className="grid border-b border-gray-100"
                        style={{ gridTemplateColumns: `60px repeat(${Math.max(activeDesigners.length,1)},1fr)` }}
                      >
                        <div className="p-3 text-xs text-gray-400 font-medium text-center border-r border-gray-100">시간</div>
                        {activeDesigners.map((d) => {
                          const off = isDesignerOff(d, viewDate);
                          return (
                            <div key={d.id} className={`p-3 border-r border-gray-100 last:border-r-0 ${off ? "bg-gray-50" : ""}`}>
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${off ? "opacity-40" : ""}`} style={{ background: d.color }}>
                                  {d.profileInitial}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-sm font-semibold truncate ${off ? "text-gray-400" : "text-gray-900"}`}>{d.name}</p>
                                  <p className="text-xs text-gray-400">{d.roleTitle}</p>
                                </div>
                              </div>
                              {off && <div className="mt-1.5 text-center"><span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">휴무</span></div>}
                            </div>
                          );
                        })}
                      </div>
                      {HOURS.map((hour) => {
                        const hourNum = parseInt(hour);
                        return (
                          <div key={hour} className="grid border-b border-gray-50"
                            style={{ gridTemplateColumns: `60px repeat(${Math.max(activeDesigners.length,1)},1fr)`, minHeight: 64 }}
                          >
                            <div className="p-2 text-xs text-gray-400 text-right pr-3 pt-2 border-r border-gray-100 flex-shrink-0">{hour}</div>
                            {activeDesigners.map((d) => {
                              const off = isDesignerOff(d, viewDate);
                              const slotRes = reservations.filter((r) => {
                                const h = parseInt(r.time.split(":")[0]);
                                return r.designerId === d.id && h === hourNum;
                              });
                              return (
                                <div key={d.id} className={`border-r border-gray-50 last:border-r-0 p-1 ${off ? "bg-gray-50/60" : ""}`}>
                                  {slotRes.map((r) => (
                                    <div key={r.id} onClick={() => setSelectedReservationId(r.id)}
                                      className={`rounded-lg px-2 py-1.5 mb-1 cursor-pointer border text-xs transition-all hover:opacity-80 hover:shadow-sm ${SOURCE_COLORS_BG[r.source] ?? "bg-gray-100 border-gray-200"}`}
                                    >
                                      <div className="flex items-center justify-between gap-1 mb-0.5">
                                        <p className={`font-semibold truncate ${SOURCE_TEXT[r.source] ?? "text-gray-800"}`}>{r.customerName}</p>
                                        <span className={`text-[9px] px-1 py-0.5 rounded font-semibold flex-shrink-0 ${STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-500"}`}>{statusLabel(r.status)}</span>
                                      </div>
                                      <p className="text-gray-500 truncate text-[10px]">{r.serviceName}</p>
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
                )}
              </div>

              {/* ── 우측 사이드바 (lg 이상) ──────────────────────── */}
              <div className="hidden lg:block w-64 flex-shrink-0 space-y-4">

                {/* ════ 월간 사이드바 ════ */}
                {view === "월" && (
                  <>
                    {/* 월간 통계 */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                        <CalendarDays size={14} className="text-blue-500" />
                        {formatMonthDisplay(viewDate)} 통계
                      </h3>
                      {[
                        { label: "전체 예약",  value: `${monthStats.total}건`,     color: "text-gray-900" },
                        { label: "완료",       value: `${monthStats.completed}건`, color: "text-green-600" },
                        { label: "완료 매출",  value: `${(monthStats.revenue).toLocaleString()}원`, color: "text-green-700" },
                        { label: "남은 예약",  value: `${monthStats.remaining}건`, color: "text-blue-600" },
                        { label: "노쇼",       value: `${monthStats.noShow}건`,    color: "text-red-500" },
                        { label: "취소",       value: `${monthStats.cancelled}건`, color: "text-gray-400" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                          <span className="text-xs text-gray-500">{item.label}</span>
                          <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* 선택된 날 상세 */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      {selectedMonthDate ? (
                        <>
                          <h3 className="font-semibold text-gray-900 mb-3 text-sm">
                            {formatMonthDayHeader(selectedMonthDate)}
                            <span className="ml-1.5 text-xs font-normal text-gray-400">{selectedDateRes.length}건</span>
                          </h3>
                          {selectedDateRes.length === 0 ? (
                            <div className="text-center py-6 text-gray-400">
                              <CalendarDays size={24} className="mx-auto mb-2 opacity-30" />
                              <p className="text-xs">예약 없음</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {selectedDateRes.slice().sort((a,b)=>a.time.localeCompare(b.time)).map((r) => (
                                <div key={r.id}
                                  onClick={() => setSelectedReservationId(r.id)}
                                  className={`rounded-lg px-2 py-2 cursor-pointer border text-xs transition-all hover:opacity-80 ${SOURCE_COLORS_BG[r.source] ?? "bg-gray-50 border-gray-200"}`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <p className={`font-semibold ${SOURCE_TEXT[r.source] ?? "text-gray-800"}`}>{r.time} {r.customerName}</p>
                                    <span className={`text-[9px] px-1 py-0.5 rounded font-semibold flex-shrink-0 ${STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-500"}`}>{statusLabel(r.status)}</span>
                                  </div>
                                  <p className="text-gray-500 truncate text-[10px]">{r.designerName} · {r.serviceName}</p>
                                  <p className="text-gray-400 text-[10px] mt-0.5">{sourceLabel(r.source)} · {r.duration}분</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <CalendarDays size={28} className="mx-auto mb-2 opacity-30" />
                          <p className="text-xs leading-relaxed">날짜를 클릭하면<br />해당 날의 예약 목록이<br />표시됩니다.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ════ 일/주간 사이드바 ════ */}
                {view !== "월" && (
                  <>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm">예약 요약</h3>
                      <p className="text-xs text-gray-400 mb-3">
                        {view === "주" ? formatWeekRange(weekDates) : viewDate}
                      </p>
                      {[
                        { label: view === "주" ? "이번 주 전체" : "전체 예약", value: `${reservations.length}건`, color: "text-gray-900" },
                        { label: "확정",  value: `${confirmedCount}건`, color: "text-blue-600" },
                        { label: "완료",  value: `${completedCount}건`, color: "text-green-600" },
                        { label: "대기",  value: `${pendingCount}건`,   color: "text-yellow-600" },
                        { label: "노쇼",  value: `${noShowCount}건`,    color: "text-red-500" },
                        { label: "취소",  value: `${cancelledCount}건`, color: "text-gray-400" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                          <span className="text-xs text-gray-500">{item.label}</span>
                          <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>

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
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
