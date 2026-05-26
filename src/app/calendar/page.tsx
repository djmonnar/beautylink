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
import { subscribeReservations, changeReservationStatus } from "@/services/reservations";
import { getDesigners } from "@/services/designers";
import type { Reservation, Designer, ReservationStatus, PermissionRole, UserRole } from "@/types";
import type { UserData } from "@/context/AuthContext";

const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 9}:00`);

// 시드 데이터가 있는 데모 날짜
const DEMO_DATE = "2025-05-25";

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

const STATUS_ACTIONS: { status: ReservationStatus; label: string; activeColor: string; btnColor: string }[] = [
  { status: "confirmed", label: "확정 처리", activeColor: "ring-blue-500", btnColor: "bg-blue-600 hover:bg-blue-700 text-white" },
  { status: "completed", label: "완료 처리", activeColor: "ring-green-500", btnColor: "bg-green-600 hover:bg-green-700 text-white" },
  { status: "noShow",    label: "노쇼 처리", activeColor: "ring-red-500",   btnColor: "bg-red-600 hover:bg-red-700 text-white" },
  { status: "cancelled", label: "취소 처리", activeColor: "ring-gray-400",  btnColor: "bg-gray-600 hover:bg-gray-700 text-white" },
  { status: "pending",   label: "대기 처리", activeColor: "ring-yellow-400",btnColor: "bg-yellow-500 hover:bg-yellow-600 text-white" },
];

const CANCEL_REASONS = ["고객 요청", "일정 변경", "매장 사정", "무응답", "기타"];

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
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  const em = String(end.getMonth() + 1).padStart(2, "0");
  const ed = String(end.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${mm}.${dd} (${days[d.getDay()]}) ~ ${em}.${ed} (${days[end.getDay()]})`;
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
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-900">예약 상세</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[72vh] overflow-y-auto space-y-5">
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
        <div className="px-6 py-4 border-t border-gray-100">
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
  const salonId = userData?.salonId ?? "salon1";

  const [view, setView] = useState<"일" | "주" | "월">("주");
  const [viewDate, setViewDate] = useState(DEMO_DATE);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  // ID만 저장 → reservations 구독 업데이트 시 자동으로 최신 데이터 참조
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const selectedReservation = selectedReservationId
    ? reservations.find((r) => r.id === selectedReservationId) ?? null
    : null;

  // 실시간 예약 구독
  useEffect(() => {
    const unsub = subscribeReservations(salonId, viewDate, setReservations);
    return () => unsub();
  }, [salonId, viewDate]);

  // 디자이너 1회 로드
  useEffect(() => {
    getDesigners(salonId).then(setDesigners);
  }, [salonId]);

  // inactive 디자이너는 숨김, active/off 디자이너는 표시
  const activeDesigners = designers.filter((d) => d.status !== "inactive");

  // 특정 날짜에 디자이너가 휴무인지 확인
  function isDesignerOff(designer: Designer, dateStr: string): boolean {
    if (designer.status === "off") return true;
    if (designer.daysOff && designer.daysOff.includes(dateStr)) return true;
    return false;
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

  const step = view === "일" ? 1 : 7;

  const confirmedCount  = reservations.filter((r) => r.status === "confirmed").length;
  const pendingCount    = reservations.filter((r) => r.status === "pending").length;
  const completedCount  = reservations.filter((r) => r.status === "completed").length;
  const noShowCount     = reservations.filter((r) => r.status === "noShow").length;
  const cancelledCount  = reservations.filter((r) => r.status === "cancelled").length;

  return (
    <AdminLayout title="예약 통합 캘린더" description="디자이너별 예약 현황을 한눈에 확인하고 관리하세요.">
      {selectedReservation && (
        <ReservationModal
          r={selectedReservation}
          salonId={salonId}
          userData={userData}
          onClose={() => setSelectedReservationId(null)}
        />
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

        <div className="flex gap-4">
          {/* Main calendar */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
          </div>

          {/* Right sidebar */}
          <div className="w-64 flex-shrink-0 space-y-4">
            {/* Today summary */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">예약 요약</h3>
              <p className="text-xs text-gray-400 mb-3">{viewDate}</p>
              {[
                { label: "전체 예약", value: `${reservations.length}건`, color: "text-gray-900" },
                { label: "확정",      value: `${confirmedCount}건`,  color: "text-blue-600" },
                { label: "완료",      value: `${completedCount}건`,  color: "text-green-600" },
                { label: "대기",      value: `${pendingCount}건`,    color: "text-yellow-600" },
                { label: "노쇼",      value: `${noShowCount}건`,     color: "text-red-500" },
                { label: "취소",      value: `${cancelledCount}건`,  color: "text-gray-400" },
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
