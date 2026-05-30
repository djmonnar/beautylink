"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { sourceColor, sourceLabel, statusColor, statusLabel } from "@/data/mock";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeReservations,
  subscribeReservationsWeek,
  changeReservationStatus,
} from "@/services/reservations";
import { getDesigners } from "@/services/designers";
import { isDesignerWorkingOnDate } from "@/lib/designerSchedule";
import type { Reservation, Designer, ReservationStatus, PermissionRole, UserRole } from "@/types";
import type { UserData } from "@/context/AuthContext";

const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 9}:00`);

// 시드 데이터가 있는 데모 날짜
const DEMO_DATE = "2025-05-25";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const ROLE_MAP: Record<UserRole, PermissionRole> = {
  owner: "원장",
  manager: "매니저",
  designer: "디자이너",
};

// 상태 배지 색상 (캘린더 카드용)
const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  noShow: "bg-red-100 text-red-700",
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

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** 주어진 날짜가 속한 주의 월요일(한국 기준) 날짜 반환 */
function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr);
  const dow = d.getUTCDay(); // 0=일, 1=월 ... 6=토
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

/** 월요일~일요일 7개 날짜 문자열 배열 반환 */
function getWeekDates(dateStr: string): string[] {
  const monday = getWeekMonday(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** 단일 날짜 표시: "2025.05.25 (일)" */
function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}.${mm}.${dd} (${DAY_NAMES[d.getDay()]})`;
}

/** 주간 범위 표시: "2025.05.19 (월) ~ 05.25 (일)" */
function formatWeekRange(weekDates: string[]): string {
  const first = new Date(weekDates[0] + "T00:00:00");
  const last = new Date(weekDates[6] + "T00:00:00");
  const y = first.getFullYear();
  const mm1 = String(first.getMonth() + 1).padStart(2, "0");
  const dd1 = String(first.getDate()).padStart(2, "0");
  const mm2 = String(last.getMonth() + 1).padStart(2, "0");
  const dd2 = String(last.getDate()).padStart(2, "0");
  return `${y}.${mm1}.${dd1} (${DAY_NAMES[first.getDay()]}) ~ ${mm2}.${dd2} (${DAY_NAMES[last.getDay()]})`;
}

/** 짧은 날짜: "05.25 (일)" */
function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd} (${DAY_NAMES[d.getDay()]})`;
}

// ── 예약 상세 모달 ─────────────────────────────────────────────────────────
function ReservationModal({
  r,
  salonId,
  userData,
  onClose,
}: {
  r: Reservation;
  salonId: string;
  userData: UserData | null;
  onClose: () => void;
}) {
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("고객 요청");
  const [changing, setChanging] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const userRole = userData?.role ?? "designer";
  const isOwnerOrManager = userRole === "owner" || userRole === "manager";
  const isOwnDesigner = userRole === "designer" && r.designerId === userData?.designerId;

  function canDoAction(targetStatus: ReservationStatus): boolean {
    if (isOwnerOrManager) return true;
    if (isOwnDesigner && (targetStatus === "completed" || targetStatus === "noShow")) return true;
    return false;
  }

  async function handleStatusChange(newStatus: ReservationStatus, reason?: string) {
    if (!canDoAction(newStatus)) return;
    setChanging(true);
    setMsg(null);
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
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-lg text-gray-900">예약 상세</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-5">
          {/* 기본 정보 */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs text-gray-400 flex-shrink-0">현재 상태</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(r.status)}`}>
                {statusLabel(r.status)}
              </span>
            </div>
            {[
              { label: "고객명",       value: r.customerName },
              { label: "연락처",       value: r.customerPhoneMasked },
              { label: "담당 디자이너", value: r.designerName },
              { label: "시술 메뉴",    value: r.serviceName },
              { label: "예약 일시",    value: `${r.date} ${r.time}` },
              { label: "소요시간",     value: `${r.duration}분` },
              { label: "금액",         value: `${r.price.toLocaleString()}원` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="w-24 text-xs text-gray-400 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-sm font-medium text-gray-900 leading-snug">{value}</span>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs text-gray-400 flex-shrink-0">예약 출처</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sourceColor(r.source)}`}>
                {sourceLabel(r.source)}
              </span>
            </div>
            {r.note && (
              <div className="flex gap-3">
                <span className="w-24 text-xs text-gray-400 flex-shrink-0 pt-0.5">요청사항</span>
                <span className="text-sm text-gray-700 leading-relaxed">{r.note}</span>
              </div>
            )}
            {r.internalMemo && (
              <div className="flex gap-3">
                <span className="w-24 text-xs text-gray-400 flex-shrink-0 pt-0.5">내부 메모</span>
                <span className="text-sm text-gray-700 leading-relaxed">{r.internalMemo}</span>
              </div>
            )}
            {r.cancelReason && (
              <div className="flex items-center gap-3">
                <span className="w-24 text-xs text-gray-400 flex-shrink-0">취소 사유</span>
                <span className="text-sm text-red-600 font-medium">{r.cancelReason}</span>
              </div>
            )}
          </div>

          {/* 상태 변경 */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">상태 변경</h4>
              {!isOwnerOrManager && isOwnDesigner && (
                <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                  완료·노쇼만 처리 가능
                </span>
              )}
              {!isOwnerOrManager && !isOwnDesigner && (
                <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                  권한 없음
                </span>
              )}
            </div>

            {/* 피드백 메시지 */}
            {msg && (
              <div
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs mb-3 border ${
                  msg.ok
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {msg.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                {msg.text}
              </div>
            )}

            {/* 상태 버튼들 */}
            <div className="flex flex-wrap gap-2">
              {STATUS_ACTIONS.map(({ status, label, activeColor, btnColor }) => {
                const isCurrent = r.status === status;
                const hasPermission = canDoAction(status);

                return (
                  <button
                    key={status}
                    onClick={() => {
                      if (!hasPermission || changing) return;
                      if (status === "cancelled") {
                        setShowCancelForm(true);
                        setMsg(null);
                      } else {
                        handleStatusChange(status);
                      }
                    }}
                    disabled={isCurrent || !hasPermission || changing}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isCurrent
                        ? `${btnColor} ring-2 ring-offset-1 ${activeColor} opacity-100`
                        : !hasPermission
                        ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                        : `${btnColor} disabled:opacity-50`
                    } disabled:cursor-not-allowed`}
                  >
                    {changing && status !== "cancelled" ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : isCurrent ? (
                      <CheckCircle size={11} />
                    ) : null}
                    {label}
                  </button>
                );
              })}
            </div>

            {/* 취소 사유 폼 */}
            {showCancelForm && (
              <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2.5">취소 사유 선택</p>
                <div className="space-y-2 mb-4">
                  {CANCEL_REASONS.map((reason) => (
                    <label key={reason} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason}
                        checked={cancelReason === reason}
                        onChange={() => setCancelReason(reason)}
                        className="accent-red-600"
                      />
                      <span className="text-sm text-gray-700">{reason}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowCancelForm(false); setMsg(null); }}
                    className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                  >
                    돌아가기
                  </button>
                  <button
                    onClick={() => handleStatusChange("cancelled", cancelReason)}
                    disabled={changing}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {changing ? <><Loader2 size={11} className="animate-spin" />처리 중...</> : "취소 처리 확인"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 캘린더 페이지 ─────────────────────────────────────────────────────
export default function CalendarPage() {
  const { userData } = useAuth();
  const salonId = userData?.salonId ?? null;

  const [view, setView] = useState<"일" | "주" | "월">("주");
  const [viewDate, setViewDate] = useState(DEMO_DATE);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  // 주간 모바일 뷰에서 선택된 날짜 칩
  const [mobileWeekDay, setMobileWeekDay] = useState(DEMO_DATE);
  // ID만 저장 → reservations 구독 업데이트 시 자동으로 최신 데이터 참조
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const selectedReservation = selectedReservationId
    ? reservations.find((r) => r.id === selectedReservationId) ?? null
    : null;

  // 주간 날짜 배열 (월요일~일요일)
  const weekDates = getWeekDates(viewDate);

  // 주간 뷰 전환 또는 주 이동 시 mobileWeekDay 동기화
  useEffect(() => {
    if (view === "주") {
      setMobileWeekDay(viewDate);
    }
  }, [view, viewDate]);

  // 실시간 예약 구독 (뷰에 따라 단일 날짜 / 주간 전환)
  useEffect(() => {
    if (!salonId) return; // salonId 없으면 구독 skip
    if (view === "주") {
      const wd = getWeekDates(viewDate);
      const unsub = subscribeReservationsWeek(salonId, wd, setReservations);
      return () => unsub();
    } else {
      const unsub = subscribeReservations(salonId, viewDate, setReservations);
      return () => unsub();
    }
  }, [salonId, viewDate, view]);

  // 디자이너 1회 로드
  useEffect(() => {
    if (!salonId) return; // salonId 없으면 로드 skip
    getDesigners(salonId).then(setDesigners);
  }, [salonId]);

  // inactive 디자이너는 숨김
  const activeDesigners = designers.filter((d) => d.status !== "inactive");

  // 특정 날짜에 디자이너가 휴무인지 확인 (workDays + daysOff + status 통합)
  function isDesignerOff(designer: Designer, dateStr: string): boolean {
    if (designer.status === "off") return true;
    return !isDesignerWorkingOnDate(designer, new Date(dateStr + "T00:00:00"));
  }

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

  // ── 네비게이션 ────────────────────────────────────────────────────────────
  function navigatePrev() {
    if (view === "주") {
      // 현재 주의 월요일에서 -7일 → 이전 주 월요일
      setViewDate(addDays(getWeekMonday(viewDate), -7));
    } else {
      setViewDate((d) => addDays(d, -1));
    }
  }

  function navigateNext() {
    if (view === "주") {
      // 현재 주의 월요일에서 +7일 → 다음 주 월요일
      setViewDate(addDays(getWeekMonday(viewDate), 7));
    } else {
      setViewDate((d) => addDays(d, 1));
    }
  }

  // ── 통계 ─────────────────────────────────────────────────────────────────
  // 전체 (주간 뷰: 이번 주 전체, 일별 뷰: 해당 날짜)
  const confirmedCount = reservations.filter((r) => r.status === "confirmed").length;
  const pendingCount   = reservations.filter((r) => r.status === "pending").length;
  const completedCount = reservations.filter((r) => r.status === "completed").length;
  const noShowCount    = reservations.filter((r) => r.status === "noShow").length;
  const cancelledCount = reservations.filter((r) => r.status === "cancelled").length;

  // 모바일 주간 뷰: 선택된 날 기준 통계
  const dayRes = view === "주"
    ? reservations.filter((r) => r.date === mobileWeekDay)
    : reservations;

  const mobileReservationCard = (r: Reservation) => (
    <div
      key={r.id}
      onClick={() => setSelectedReservationId(r.id)}
      className="bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 cursor-pointer active:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        {/* 왼쪽: 시간 + 정보 */}
        <div className="flex gap-3 min-w-0">
          <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
            <span className="text-sm font-bold text-gray-900 tabular-nums">{r.time}</span>
            <div className={`w-2 h-2 rounded-full ${
              SOURCE_COLORS_BG[r.source]?.includes("emerald") ? "bg-emerald-400"
              : SOURCE_COLORS_BG[r.source]?.includes("blue") ? "bg-blue-400"
              : SOURCE_COLORS_BG[r.source]?.includes("rose") ? "bg-rose-400"
              : "bg-purple-400"
            }`} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight">{r.customerName}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{r.serviceName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{r.designerName} · {r.duration}분</p>
          </div>
        </div>
        {/* 오른쪽: 상태 + 출처 */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-500"}`}>
            {statusLabel(r.status)}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sourceColor(r.source)}`}>
            {sourceLabel(r.source)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout title="예약 통합 캘린더" description="디자이너별 예약 현황을 한눈에 확인하고 관리하세요.">
      {/* ── salonId 미연결 가드 ───────────────────────────────────────── */}
      {!salonId ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <p className="text-amber-800 font-semibold mb-1">
            매장 정보가 연결되지 않았습니다.
          </p>
          <p className="text-sm text-amber-600">
            users/{userData?.uid ?? "—"}.salonId를 확인해주세요.
          </p>
        </div>
      ) : (
      <>
      {selectedReservation && (
        <ReservationModal
          r={selectedReservation}
          salonId={salonId}
          userData={userData}
          onClose={() => setSelectedReservationId(null)}
        />
      )}

      <div className="space-y-4">
        {/* ── 컨트롤 바 ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
          {/* 뷰 전환 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["일", "주"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  view === v ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {v}
              </button>
            ))}
            {/* 월간 뷰 준비중 */}
            <span className="relative px-3 py-1.5 text-sm font-medium rounded-md text-gray-300 cursor-not-allowed select-none">
              월
              <span className="absolute -top-1 -right-0.5 text-[8px] bg-gray-200 text-gray-400 px-1 py-0.5 rounded-full leading-none whitespace-nowrap">
                준비중
              </span>
            </span>
          </div>

          {/* 날짜 네비게이션 */}
          <div className="flex items-center gap-2">
            <button
              onClick={navigatePrev}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {view === "주" ? (
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
            <button
              onClick={navigateNext}
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

          {/* 범례: 모바일 숨김 */}
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

        {/* ════════════════════════════════════════════════════════════════
            모바일 영역 (md 미만)
        ════════════════════════════════════════════════════════════════ */}

        {/* ── 모바일 주간 뷰 (view==="주") ─────────────────────────────── */}
        {view === "주" && (
          <div className="md:hidden space-y-3">
            {/* 선택된 날 통계 스트립 */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                {formatDateShort(mobileWeekDay)}
              </span>
              {[
                { label: "전체", value: dayRes.length, color: "text-gray-700" },
                { label: "확정", value: dayRes.filter(r => r.status === "confirmed").length, color: "text-blue-600" },
                { label: "완료", value: dayRes.filter(r => r.status === "completed").length, color: "text-green-600" },
                { label: "대기", value: dayRes.filter(r => r.status === "pending").length,   color: "text-yellow-600" },
                { label: "노쇼", value: dayRes.filter(r => r.status === "noShow").length,    color: "text-red-500" },
              ].map((s) => (
                <span key={s.label} className={`font-medium ${s.color}`}>
                  {s.label} <span className="font-bold">{s.value}</span>
                </span>
              ))}
            </div>

            {/* 요일 칩 (월~일) */}
            <div className="flex gap-1.5">
              {weekDates.map((dateStr) => {
                const d = new Date(dateStr + "T00:00:00");
                const isSelected = mobileWeekDay === dateStr;
                const cnt = reservations.filter((r) => r.date === dateStr).length;
                const dow = d.getDay();
                const isSun = dow === 0;
                const isSat = dow === 6;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setMobileWeekDay(dateStr)}
                    className={`flex-1 flex flex-col items-center py-2 rounded-xl border font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <span className={`text-[9px] leading-none mb-0.5 ${
                      isSelected ? "text-blue-200"
                      : isSun ? "text-red-400"
                      : isSat ? "text-blue-400"
                      : "text-gray-400"
                    }`}>
                      {DAY_NAMES[dow]}
                    </span>
                    <span className={`text-sm font-bold leading-tight ${
                      isSelected ? "text-white"
                      : isSun ? "text-red-500"
                      : isSat ? "text-blue-500"
                      : "text-gray-800"
                    }`}>
                      {d.getDate()}
                    </span>
                    <span className={`text-[9px] h-3 leading-3 mt-0.5 font-semibold ${
                      isSelected ? "text-blue-200" : "text-blue-500"
                    }`}>
                      {cnt > 0 ? cnt : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 선택된 날 예약 리스트 */}
            <div className="space-y-2">
              {dayRes.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-400">이 날짜의 예약이 없습니다.</p>
                </div>
              ) : (
                dayRes
                  .slice()
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map(mobileReservationCard)
              )}
            </div>
          </div>
        )}

        {/* ── 모바일 요약 스트립 (view==="일") ─────────────────────────── */}
        {view !== "주" && (
          <div className="md:hidden flex items-center gap-2 flex-wrap text-xs">
            {[
              { label: "전체", value: reservations.length, color: "text-gray-700" },
              { label: "확정", value: confirmedCount,  color: "text-blue-600" },
              { label: "완료", value: completedCount,  color: "text-green-600" },
              { label: "대기", value: pendingCount,    color: "text-yellow-600" },
              { label: "노쇼", value: noShowCount,     color: "text-red-500" },
            ].map((s) => (
              <span key={s.label} className={`font-medium ${s.color}`}>
                {s.label} <span className="font-bold">{s.value}</span>
              </span>
            ))}
          </div>
        )}

        {/* ── 모바일 리스트 뷰 (view==="일") ───────────────────────────── */}
        {view !== "주" && (
          <div className="md:hidden space-y-2">
            {reservations.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
                <p className="text-sm text-gray-400">이 날짜의 예약이 없습니다.</p>
              </div>
            ) : (
              reservations
                .slice()
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(mobileReservationCard)
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            데스크탑/태블릿 영역 (md 이상)
        ════════════════════════════════════════════════════════════════ */}
        <div className="hidden md:flex gap-4">

          {/* ── 메인 캘린더 영역 ─────────────────────────────────────── */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-w-0">

            {/* ── 주간 그리드 (view==="주") ───────────────────────────── */}
            {view === "주" && (
              <div className="overflow-x-auto">
                <div style={{ minWidth: 700 }}>
                  {/* 주간 날짜 헤더 */}
                  <div
                    className="grid border-b border-gray-100"
                    style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
                  >
                    {weekDates.map((dateStr) => {
                      const d = new Date(dateStr + "T00:00:00");
                      const cnt = reservations.filter((r) => r.date === dateStr).length;
                      const isToday = dateStr === DEMO_DATE;
                      const dow = d.getDay();
                      const isSun = dow === 0;
                      const isSat = dow === 6;
                      return (
                        <div
                          key={dateStr}
                          className={`p-3 border-r border-gray-100 last:border-r-0 text-center ${
                            isToday ? "bg-blue-50" : ""
                          }`}
                        >
                          <p className={`text-xs font-semibold ${
                            isToday ? "text-blue-600"
                            : isSun ? "text-red-500"
                            : isSat ? "text-blue-500"
                            : "text-gray-700"
                          }`}>
                            {d.getMonth() + 1}.{String(d.getDate()).padStart(2, "0")} ({DAY_NAMES[dow]})
                          </p>
                          {cnt > 0 ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${
                              isToday ? "bg-blue-200 text-blue-800" : "bg-gray-100 text-gray-600"
                            }`}>
                              {cnt}건
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-300 mt-1 inline-block">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 날짜별 예약 카드 */}
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: "repeat(7, 1fr)", minHeight: 400 }}
                  >
                    {weekDates.map((dateStr) => {
                      const isToday = dateStr === DEMO_DATE;
                      const sorted = reservations
                        .filter((r) => r.date === dateStr)
                        .sort((a, b) => a.time.localeCompare(b.time));
                      return (
                        <div
                          key={dateStr}
                          className={`border-r border-gray-50 last:border-r-0 p-1.5 ${
                            isToday ? "bg-blue-50/30" : ""
                          }`}
                        >
                          {sorted.length === 0 ? (
                            <p className="text-[10px] text-gray-300 text-center pt-6">예약 없음</p>
                          ) : (
                            sorted.map((r) => (
                              <div
                                key={r.id}
                                onClick={() => setSelectedReservationId(r.id)}
                                className={`rounded-lg px-2 py-1.5 mb-1.5 cursor-pointer border text-xs transition-all hover:opacity-80 hover:shadow-sm ${
                                  SOURCE_COLORS_BG[r.source] ?? "bg-gray-100 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <p className={`font-semibold truncate ${SOURCE_TEXT[r.source] ?? "text-gray-800"}`}>
                                    {r.time} {r.customerName}
                                  </p>
                                  <span className={`text-[9px] px-1 py-0.5 rounded font-semibold flex-shrink-0 ${
                                    STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-500"
                                  }`}>
                                    {statusLabel(r.status)}
                                  </span>
                                </div>
                                <p className="text-gray-500 truncate text-[10px]">
                                  {r.designerName} · {r.serviceName}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── 일별 그리드 (view!=="주") ───────────────────────────── */}
            {view !== "주" && (
              <div className="overflow-x-auto">
                <div style={{ minWidth: 600 }}>
                  {/* Header */}
                  <div
                    className="grid border-b border-gray-100"
                    style={{ gridTemplateColumns: `60px repeat(${Math.max(activeDesigners.length, 1)}, 1fr)` }}
                  >
                    <div className="p-3 text-xs text-gray-400 font-medium text-center border-r border-gray-100">시간</div>
                    {activeDesigners.map((d) => {
                      const off = isDesignerOff(d, viewDate);
                      return (
                        <div key={d.id} className={`p-3 border-r border-gray-100 last:border-r-0 ${off ? "bg-gray-50" : ""}`}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${off ? "opacity-40" : ""}`}
                              style={{ background: d.color }}
                            >
                              {d.profileInitial}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold truncate ${off ? "text-gray-400" : "text-gray-900"}`}>{d.name}</p>
                              <p className="text-xs text-gray-400">{d.roleTitle}</p>
                            </div>
                          </div>
                          {off && (
                            <div className="mt-1.5 text-center">
                              <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">휴무</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Time slots */}
                  {HOURS.map((hour) => {
                    const hourNum = parseInt(hour);
                    return (
                      <div
                        key={hour}
                        className="grid border-b border-gray-50"
                        style={{
                          gridTemplateColumns: `60px repeat(${Math.max(activeDesigners.length, 1)}, 1fr)`,
                          minHeight: 64,
                        }}
                      >
                        <div className="p-2 text-xs text-gray-400 text-right pr-3 pt-2 border-r border-gray-100 flex-shrink-0">
                          {hour}
                        </div>
                        {activeDesigners.map((d) => {
                          const off = isDesignerOff(d, viewDate);
                          const resInSlot = reservations.filter((r) => {
                            const h = parseInt(r.time.split(":")[0]);
                            return r.designerId === d.id && h === hourNum;
                          });
                          return (
                            <div key={d.id} className={`border-r border-gray-50 last:border-r-0 p-1 relative ${off ? "bg-gray-50/60" : ""}`}>
                              {resInSlot.map((r) => (
                                <div
                                  key={r.id}
                                  onClick={() => setSelectedReservationId(r.id)}
                                  className={`rounded-lg px-2 py-1.5 mb-1 cursor-pointer border text-xs transition-all hover:opacity-80 hover:shadow-sm ${SOURCE_COLORS_BG[r.source] ?? "bg-gray-100 border-gray-200"}`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <p className={`font-semibold truncate ${SOURCE_TEXT[r.source] ?? "text-gray-800"}`}>
                                      {r.customerName}
                                    </p>
                                    <span className={`text-[9px] px-1 py-0.5 rounded font-semibold flex-shrink-0 ${STATUS_BADGE[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                                      {statusLabel(r.status)}
                                    </span>
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

          {/* ── 우측 사이드바 (lg 이상) ──────────────────────────────── */}
          <div className="hidden lg:block w-64 flex-shrink-0 space-y-4">
            {/* 예약 요약 카드 */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">예약 요약</h3>
              <p className="text-xs text-gray-400 mb-3">
                {view === "주" ? formatWeekRange(weekDates) : viewDate}
              </p>
              {[
                { label: view === "주" ? "이번 주 전체" : "전체 예약", value: `${reservations.length}건`, color: "text-gray-900" },
                { label: "확정", value: `${confirmedCount}건`, color: "text-blue-600" },
                { label: "완료", value: `${completedCount}건`, color: "text-green-600" },
                { label: "대기", value: `${pendingCount}건`,   color: "text-yellow-600" },
                { label: "노쇼", value: `${noShowCount}건`,    color: "text-red-500" },
                { label: "취소", value: `${cancelledCount}건`, color: "text-gray-400" },
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
                  { label: "전화 33%",   color: "bg-blue-400" },
                  { label: "방문 17%",   color: "bg-rose-400" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                    <div className={`w-2 h-2 rounded-full ${s.color}`} />
                    {s.label}
                  </div>
                ))}
              </div>
            </div>

            {/* 최근 예약 알림 */}
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
      </>
      )}
    </AdminLayout>
  );
}
