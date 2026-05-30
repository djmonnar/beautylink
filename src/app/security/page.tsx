"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { MOCK_ACCESS_LOGS } from "@/data/mock";
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  FlaskConical,
  ChevronRight,
  AlertCircle,
  Clock,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────

const DANGER_ACTIONS = new Set([
  "customer_private_viewed",
  "customer_updated",
  "reservation_cancelled",
  "reservation_no_show",
  "permission_denied",
  "security_rule_error",
]);

const ACTION_FILTERS = [
  { label: "전체",            value: "" },
  { label: "고객 조회",        value: "customer_viewed" },
  { label: "원본 연락처 조회", value: "customer_private_viewed" },
  { label: "고객 수정",        value: "customer_updated" },
  { label: "예약 등록",        value: "reservation_created" },
  { label: "예약 상태 변경",   value: "reservation_status_changed" },
  { label: "디자이너 수정",    value: "designer_updated" },
  { label: "스케줄 변경",      value: "designer_schedule_updated" },
  { label: "휴무일 변경",      value: "designer_days_off_updated" },
  { label: "시술 메뉴 수정",   value: "service_updated" },
  { label: "메시지 발송",      value: "message_sent" },
  { label: "내 정보 수정",     value: "user_profile_updated" },
  { label: "매장 정보 수정",   value: "salon_info_updated" },
  { label: "비밀번호 재설정",  value: "password_reset_requested" },
  { label: "QA write test",   value: "qa_write_test" },
  { label: "권한 관련",        value: "permission_denied" },
];

const DATE_FILTERS = [
  { label: "오늘",      value: "today" },
  { label: "최근 7일",  value: "7days" },
  { label: "최근 30일", value: "30days" },
  { label: "전체",      value: "all" },
];

const PERMISSIONS_TABLE = [
  { feature: "고객 연락처 전체 열람", owner: true,  manager: true,  designer: false },
  { feature: "예약 등록/수정",        owner: true,  manager: true,  designer: true },
  { feature: "예약 취소",             owner: true,  manager: true,  designer: false },
  { feature: "고객 정보 열람",        owner: true,  manager: true,  designer: true },
  { feature: "고객 정보 수정",        owner: true,  manager: true,  designer: false },
  { feature: "매출 조회",             owner: true,  manager: true,  designer: false },
  { feature: "직원 관리",             owner: true,  manager: false, designer: false },
  { feature: "시술 메뉴 수정",        owner: true,  manager: true,  designer: false },
  { feature: "메시지 발송",           owner: true,  manager: true,  designer: false },
  { feature: "접근 로그 조회",        owner: true,  manager: true,  designer: false },
  { feature: "보안 설정 변경",        owner: true,  manager: false, designer: false },
  { feature: "QA 검수센터",           owner: true,  manager: false, designer: false },
];

// ── Types ─────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  userId?: string;
  userName?: string;
  role?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  createdAt?: unknown; // Firestore Timestamp | string | undefined
}

// ── Helpers ───────────────────────────────────────────────────────────────

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate(): Date }).toDate();
  }
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDateTime(val: unknown): string {
  const d = toDate(val);
  if (!d) return "-";
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function roleLabel(role?: string): string {
  if (role === "owner"   || role === "원장")   return "원장";
  if (role === "manager" || role === "매니저") return "매니저";
  if (role === "designer"|| role === "디자이너") return "디자이너";
  return role ?? "-";
}

function roleBadgeClass(role?: string): string {
  if (role === "owner"   || role === "원장")   return "bg-purple-100 text-purple-700";
  if (role === "manager" || role === "매니저") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

function actionDisplay(action?: string): string {
  if (!action) return "-";
  const map: Record<string, string> = {
    customer_viewed:              "고객 조회",
    customer_private_viewed:      "원본 연락처 조회",
    customer_updated:             "고객 수정",
    customer_created:             "고객 등록",
    reservation_created:          "예약 등록",
    reservation_status_changed:   "예약 상태 변경",
    reservation_cancelled:        "예약 취소",
    reservation_no_show:          "노쇼 처리",
    designer_updated:             "디자이너 수정",
    designer_created:             "디자이너 등록",
    designer_schedule_updated:    "근무 스케줄 변경",
    designer_work_days_updated:   "근무 요일 변경",
    designer_days_off_updated:    "휴무일 변경",
    designer_status_changed:      "디자이너 상태 변경",
    designer_deactivated:         "디자이너 비활성화",
    service_updated:              "시술 메뉴 수정",
    service_created:              "시술 메뉴 등록",
    message_sent:                 "메시지 발송 시도",
    user_profile_updated:         "내 정보 수정",
    salon_info_updated:           "매장 정보 수정",
    password_reset_requested:     "비밀번호 재설정 요청",
    qa_write_test:                "QA write test",
    permission_denied:            "권한 거부",
    security_rule_error:          "보안 규칙 오류",
  };
  return map[action] ?? action;
}

function isInDateRange(val: unknown, range: string): boolean {
  if (range === "all") return true;
  const d = toDate(val);
  if (!d) return true;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today")   return d >= today;
  if (range === "7days")   return d >= new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  if (range === "30days")  return d >= new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  return true;
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const { user, userData, loading: authLoading, firebaseReady } = useAuth();
  const router = useRouter();

  const salonId = userData?.salonId ?? null;
  const role    = userData?.role ?? "designer";
  const isOwner = role === "owner";
  const isOM    = role === "owner" || role === "manager";

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [dateFilter,   setDateFilter]   = useState("7days");
  const [userFilter,   setUserFilter]   = useState("");

  // Data
  const [logs,    setLogs]    = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // UI (keep existing toggles)
  const [maskPhone,  setMaskPhone]  = useState(true);
  const [logAccess,  setLogAccess]  = useState(true);

  // ── Auth redirect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && firebaseReady && !user) {
      router.replace("/login");
    }
  }, [authLoading, firebaseReady, user, router]);

  // ── Load logs ─────────────────────────────────────────────────────────────
  const loadLogs = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);
    setError(null);
    try {
      if (!db) {
        setLogs(MOCK_ACCESS_LOGS as unknown as LogEntry[]);
        return;
      }
      const q = query(
        collection(db, `salons/${salonId}/accessLogs`),
        orderBy("createdAt", "desc"),
        limit(200)
      );
      const snap = await getDocs(q);
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LogEntry)));
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      console.error("[Security] loadLogs error", e);
      if (err.code === "permission-denied") {
        setError("접근 권한이 없습니다. Firestore Rules를 확인하세요.");
      } else {
        setError(err.message ?? "로그를 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    if (!authLoading && user && isOM && salonId) {
      loadLogs();
    }
  }, [authLoading, user, isOM, salonId, loadLogs]);

  // ── Filtered logs ─────────────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchAction = !actionFilter || log.action === actionFilter;
      const matchDate   = isInDateRange(log.createdAt, dateFilter);
      const matchUser   = !userFilter || (log.userName ?? "").includes(userFilter);
      return matchAction && matchDate && matchUser;
    });
  }, [logs, actionFilter, dateFilter, userFilter]);

  // ── Summary stats (last 7 days) ───────────────────────────────────────────
  const stats = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = logs.filter((l) => {
      const d = toDate(l.createdAt);
      return d ? d >= cutoff : false;
    });
    return {
      total:            recent.length,
      privateViewed:    recent.filter((l) => l.action === "customer_private_viewed").length,
      reservationMod:   recent.filter((l) =>
        l.action === "reservation_status_changed" ||
        l.action === "reservation_cancelled" ||
        l.action === "reservation_no_show"
      ).length,
      customerUpdated:  recent.filter((l) => l.action === "customer_updated").length,
      qaWriteTest:      recent.filter((l) => l.action === "qa_write_test").length,
      permDenied:       recent.filter((l) =>
        l.action === "permission_denied" || l.action === "security_rule_error"
      ).length,
    };
  }, [logs]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !userData) return null;

  if (!isOM) {
    return (
      <AdminLayout title="보안 및 권한 관리" description="보안 및 권한 관리 페이지">
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-4">
          <Shield size={48} className="text-red-300" />
          <h2 className="text-xl font-bold text-gray-700">접근 권한 없음</h2>
          <p className="text-sm text-gray-400">
            보안 및 권한 관리 페이지는 원장/매니저만 접근할 수 있습니다.
          </p>
          <p className="text-xs text-gray-400">
            현재 역할: <span className="font-semibold">{roleLabel(role)}</span>
          </p>
        </div>
      </AdminLayout>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <AdminLayout title="보안 및 권한 관리" description="고객 개인정보 보호와 직원별 권한을 관리하세요.">
      <div className="space-y-6">

        {/* ── 배너 ── */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">
              뷰티링크는 고객님의 소중한 정보를 안전하게 보호합니다.
            </h2>
            <p className="text-sm text-white/70">
              연락처 마스킹, 권한 분리, 접근 로그 기록으로 개인정보를 체계적으로 관리합니다.
            </p>
          </div>
        </div>

        {/* ── 보안 요약 카드 (최근 7일) ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock size={14} className="text-blue-500" />
            보안 요약 — 최근 7일
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "전체 접근 로그",    value: stats.total,          color: "text-blue-600",   bg: "bg-blue-50" },
              { label: "원본 연락처 조회",   value: stats.privateViewed,   color: "text-amber-600",  bg: "bg-amber-50",  warn: stats.privateViewed > 0 },
              { label: "예약 수정/취소",     value: stats.reservationMod,  color: "text-purple-600", bg: "bg-purple-50" },
              { label: "고객 정보 수정",     value: stats.customerUpdated, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "QA write test",     value: stats.qaWriteTest,     color: "text-green-600",  bg: "bg-green-50" },
              { label: "권한 오류",         value: stats.permDenied,      color: "text-red-600",    bg: "bg-red-50",    warn: stats.permDenied > 0 },
            ].map(({ label, value, color, bg, warn }) => (
              <div
                key={label}
                className={`rounded-xl p-3 text-center border ${warn ? "border-amber-200 bg-amber-50" : `${bg} border-transparent`}`}
              >
                <p className="text-[11px] text-gray-500 leading-tight mb-1">{label}</p>
                <p className={`text-2xl font-bold tabular-nums ${warn ? "text-amber-600" : color}`}>{value}</p>
                {warn && value > 0 && (
                  <p className="text-[10px] text-amber-500 mt-0.5">주의</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 접근 로그 ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 헤더 */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Eye size={15} className="text-blue-600" />
              접근 로그
              {!loading && (
                <span className="text-xs font-normal text-gray-400 ml-1">
                  ({filteredLogs.length}건)
                </span>
              )}
            </h2>
            <button
              onClick={loadLogs}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              새로고침
            </button>
          </div>

          {/* 필터 */}
          <div className="px-5 py-3 border-b border-gray-100 space-y-2.5">
            {/* 날짜 필터 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-gray-400 w-12 flex-shrink-0">날짜</span>
              <div className="flex gap-1 flex-wrap">
                {DATE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setDateFilter(f.value)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      dateFilter === f.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 액션 필터 */}
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-[11px] text-gray-400 w-12 flex-shrink-0 mt-1.5">액션</span>
              <div className="flex gap-1 flex-wrap">
                {ACTION_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setActionFilter(f.value)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      actionFilter === f.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 사용자 필터 */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 w-12 flex-shrink-0">이름</span>
              <input
                type="text"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="사용자 이름 검색"
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {userFilter && (
                <button
                  onClick={() => setUserFilter("")}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 로그 본문 */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 px-5 py-6 text-sm text-red-700 bg-red-50 m-4 rounded-xl">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Eye size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">아직 기록된 접근 로그가 없습니다.</p>
              {(actionFilter || userFilter || dateFilter !== "all") && (
                <button
                  onClick={() => { setActionFilter(""); setUserFilter(""); setDateFilter("all"); }}
                  className="mt-2 text-xs text-blue-500 hover:underline"
                >
                  필터 초기화
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 데스크탑 테이블 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["시각", "사용자", "역할", "액션", "대상"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLogs.map((log) => {
                      const danger = DANGER_ACTIONS.has(log.action ?? "");
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-gray-50 ${danger ? "bg-red-50/40" : ""}`}
                        >
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {log.userName ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeClass(log.role)}`}>
                              {roleLabel(log.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1 text-xs w-fit ${danger ? "text-red-600 font-medium" : "text-gray-700"}`}>
                              {danger && <AlertTriangle size={11} className="flex-shrink-0" />}
                              {actionDisplay(log.action)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {log.targetType
                              ? `${log.targetType}${log.targetId ? ` #${log.targetId.slice(0, 8)}` : ""}`
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredLogs.map((log) => {
                  const danger = DANGER_ACTIONS.has(log.action ?? "");
                  return (
                    <div
                      key={log.id}
                      className={`px-4 py-3 ${danger ? "bg-red-50/40" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${roleBadgeClass(log.role)}`}>
                            {roleLabel(log.role)}
                          </span>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {log.userName ?? "-"}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${danger ? "text-red-600 font-medium" : "text-gray-600"}`}>
                        {danger && <AlertTriangle size={11} className="flex-shrink-0" />}
                        {actionDisplay(log.action)}
                        {log.targetType && (
                          <span className="text-gray-400 ml-1">
                            · {log.targetType}{log.targetId ? ` #${log.targetId.slice(0, 8)}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── 개인정보 보호 설정 + 역할별 권한 관리 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 개인정보 보호 설정 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 text-sm">개인정보 보호 설정</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900 text-sm">연락처 마스킹</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    010-****-5678 형태로 표시 (원장만 전체 번호 확인)
                  </p>
                </div>
                <button
                  onClick={() => setMaskPhone(!maskPhone)}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                    maskPhone ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      maskPhone ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900 text-sm">접근 로그 기록</p>
                  <p className="text-xs text-gray-500 mt-0.5">고객 정보 조회 시 자동 기록</p>
                </div>
                <button
                  onClick={() => setLogAccess(!logAccess)}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                    logAccess ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      logAccess ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="py-3">
                <p className="font-medium text-gray-900 text-sm mb-3">개인정보 수집 항목</p>
                <div className="space-y-2">
                  {[
                    { item: "이름 (필수)", purpose: "예약 서비스 제공" },
                    { item: "전화번호 (필수)", purpose: "예약 알림 발송" },
                    { item: "방문 이력 (선택)", purpose: "맞춤 서비스 제공" },
                    { item: "시술 메모 (선택)", purpose: "재방문 서비스 향상" },
                  ].map(({ item, purpose }) => (
                    <div key={item} className="flex items-start gap-2 text-xs">
                      <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-900">{item}</span>
                        <span className="text-gray-500"> — {purpose}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-1.5">보관·삭제 기준</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>· 예약 데이터: 예약일로부터 3년 보관</p>
                  <p>· 고객 개인정보: 마지막 방문 후 3년 보관</p>
                  <p>· 이용자 탈퇴 시: 즉시 삭제 (법적 의무 제외)</p>
                </div>
              </div>
            </div>
          </div>

          {/* 역할별 권한 관리 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">역할별 권한 관리</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">기능</th>
                    {["원장", "매니저", "디자이너"].map((r) => (
                      <th key={r} className="px-4 py-3 text-center text-xs font-medium text-gray-500">
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {PERMISSIONS_TABLE.map((p) => (
                    <tr key={p.feature} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-xs text-gray-700">{p.feature}</td>
                      {([p.owner, p.manager, p.designer] as const).map((allowed, i) => (
                        <td key={i} className="px-4 py-2.5 text-center">
                          {allowed ? (
                            <CheckCircle size={15} className="text-green-500 mx-auto" />
                          ) : (
                            <span className="text-gray-200">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── 역할 상세 설명 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            {
              role: "원장 (owner)",
              color: "text-purple-700",
              bg: "bg-purple-50",
              border: "border-purple-100",
              items: [
                "전체 관리 가능",
                "매장 정보 수정 가능",
                "고객 민감정보 조회 가능",
                "직원·권한 관리 가능",
                "QA 검수센터 접근 가능",
              ],
            },
            {
              role: "매니저 (manager)",
              color: "text-blue-700",
              bg: "bg-blue-50",
              border: "border-blue-100",
              items: [
                "고객·예약·디자이너·시술 관리 가능",
                "고객 민감정보 조회 가능",
                "매장 설정·권한 변경 불가",
                "접근 로그 조회 가능",
                "QA 검수센터 접근 불가",
              ],
            },
            {
              role: "디자이너 (designer)",
              color: "text-gray-700",
              bg: "bg-gray-50",
              border: "border-gray-200",
              items: [
                "본인 예약 중심 조회·처리",
                "고객 민감정보 조회 불가",
                "설정·권한 변경 불가",
                "접근 로그 조회 불가",
                "보안/권한 관리 페이지 접근 불가",
              ],
            },
          ].map((section) => (
            <div
              key={section.role}
              className={`bg-white rounded-xl p-5 shadow-sm border ${section.border}`}
            >
              <div className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${section.bg} ${section.color}`}>
                {section.role}
              </div>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── 개인정보 처리 방침 요약 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            {
              title: "개인정보 처리 목적",
              items: [
                "예약 서비스 제공",
                "예약 알림 및 리마인드 발송",
                "재방문 서비스 향상",
                "매출 통계 분석 (익명화)",
              ],
              icon: Shield,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              title: "제3자 제공 기준",
              items: [
                "원칙적 제3자 제공 금지",
                "예약 플랫폼 연동 시 최소 정보만 제공",
                "법적 의무 이행 시에만 제공",
                "사전 동의 없이 마케팅 활용 금지",
              ],
              icon: AlertCircle,
              color: "text-orange-500",
              bg: "bg-orange-50",
            },
            {
              title: "고객 권리 안내",
              items: [
                "개인정보 열람 요청 가능",
                "정보 수정·삭제 요청 가능",
                "동의 철회 가능",
                "불만 및 피해 구제 신청 가능",
              ],
              icon: CheckCircle,
              color: "text-green-600",
              bg: "bg-green-50",
            },
          ].map((section) => (
            <div key={section.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 ${section.bg} rounded-lg flex items-center justify-center`}>
                  <section.icon size={16} className={section.color} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{section.title}</h3>
              </div>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── QA 검수센터 링크 (owner 전용) ── */}
        {isOwner && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FlaskConical size={17} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Firestore 연결 상태 확인</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Firestore 연결 상태는 QA 검수센터에서 확인할 수 있습니다.
                </p>
              </div>
            </div>
            <Link
              href="/qa"
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0"
            >
              QA 검수센터
              <ChevronRight size={14} />
            </Link>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
