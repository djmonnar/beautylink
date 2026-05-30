"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { MOCK_ACCESS_LOGS } from "@/data/mock";
import { getDesigners } from "@/services/designers";
import {
  getStaffMembers,
  updateStaffRole,
  updateStaffActive,
  updateStaffDesignerLink,
  logStaffAccess,
  type StaffMember,
} from "@/services/staff";
import type { Designer, UserRole } from "@/types";
import {
  Shield,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  FlaskConical,
  ChevronRight,
  AlertCircle,
  Clock,
  Users,
  Pencil,
  X,
  UserX,
  UserCheck,
  Info,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────

const ROLE_KR = {
  owner: "원장",
  manager: "매니저",
  designer: "디자이너",
} as const;
type RoleKr = (typeof ROLE_KR)[UserRole];

const DANGER_ACTIONS = new Set([
  "customer_private_viewed",
  "customer_updated",
  "reservation_cancelled",
  "reservation_no_show",
  "permission_denied",
  "security_rule_error",
]);

const ACTION_FILTERS = [
  { label: "전체",               value: "" },
  { label: "고객 조회",          value: "customer_viewed" },
  { label: "원본 연락처 조회",   value: "customer_private_viewed" },
  { label: "고객 수정",          value: "customer_updated" },
  { label: "예약 등록",          value: "reservation_created" },
  { label: "예약 상태 변경",     value: "reservation_status_changed" },
  { label: "디자이너 수정",      value: "designer_updated" },
  { label: "스케줄 변경",        value: "designer_schedule_updated" },
  { label: "휴무일 변경",        value: "designer_days_off_updated" },
  { label: "시술 메뉴 수정",     value: "service_updated" },
  { label: "템플릿 생성",        value: "message_template_created" },
  { label: "템플릿 수정",        value: "message_template_updated" },
  { label: "Mock 발송",          value: "message_mock_sent" },
  { label: "노쇼 Mock 발송",     value: "no_show_message_mock_sent" },
  { label: "내 정보 수정",       value: "user_profile_updated" },
  { label: "매장 정보 수정",     value: "salon_info_updated" },
  { label: "비밀번호 재설정",    value: "password_reset_requested" },
  { label: "네이버 연동 설정",   value: "naver_integration_updated" },
  { label: "네이버 디자이너 매핑", value: "naver_designer_mapping_updated" },
  { label: "네이버 시술 매핑",   value: "naver_service_mapping_updated" },
  { label: "네이버 상태 변경",   value: "naver_ready_status_changed" },
  { label: "직원 역할 변경",     value: "user_role_updated" },
  { label: "직원 활성 변경",     value: "user_active_status_updated" },
  { label: "디자이너 연결",      value: "user_designer_linked" },
  { label: "직원 목록 열람",     value: "user_permission_viewed" },
  { label: "QA write test",     value: "qa_write_test" },
  { label: "권한 관련",          value: "permission_denied" },
];

const DATE_FILTERS = [
  { label: "오늘",      value: "today" },
  { label: "최근 7일",  value: "7days" },
  { label: "최근 30일", value: "30days" },
  { label: "전체",      value: "all" },
];

const PERMISSIONS_TABLE = [
  { feature: "고객 연락처 전체 열람", owner: true,  manager: true,  designer: false },
  { feature: "예약 등록/수정",        owner: true,  manager: true,  designer: true  },
  { feature: "예약 취소",             owner: true,  manager: true,  designer: false },
  { feature: "고객 정보 열람",        owner: true,  manager: true,  designer: true  },
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
  createdAt?: unknown;
}

type Tab = "logs" | "permissions" | "staff";

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
  if (role === "owner"    || role === "원장")   return "원장";
  if (role === "manager"  || role === "매니저") return "매니저";
  if (role === "designer" || role === "디자이너") return "디자이너";
  return role ?? "-";
}

function roleBadgeClass(role?: string): string {
  if (role === "owner"    || role === "원장")   return "bg-purple-100 text-purple-700";
  if (role === "manager"  || role === "매니저") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

function actionDisplay(action?: string): string {
  if (!action) return "-";
  const map: Record<string, string> = {
    customer_viewed:               "고객 조회",
    customer_private_viewed:       "원본 연락처 조회",
    customer_updated:              "고객 수정",
    customer_created:              "고객 등록",
    reservation_created:           "예약 등록",
    reservation_status_changed:    "예약 상태 변경",
    reservation_cancelled:         "예약 취소",
    reservation_no_show:           "노쇼 처리",
    designer_updated:              "디자이너 수정",
    designer_created:              "디자이너 등록",
    designer_schedule_updated:     "근무 스케줄 변경",
    designer_work_days_updated:    "근무 요일 변경",
    designer_days_off_updated:     "휴무일 변경",
    designer_status_changed:       "디자이너 상태 변경",
    designer_deactivated:          "디자이너 비활성화",
    service_updated:               "시술 메뉴 수정",
    service_created:               "시술 메뉴 등록",
    message_sent:                  "메시지 발송 시도",
    message_template_created:      "메시지 템플릿 생성",
    message_template_updated:      "메시지 템플릿 수정",
    message_template_deactivated:  "메시지 템플릿 비활성화",
    message_mock_sent:             "Mock 발송",
    no_show_message_mock_sent:     "노쇼 Mock 발송",
    user_profile_updated:          "내 정보 수정",
    salon_info_updated:            "매장 정보 수정",
    password_reset_requested:      "비밀번호 재설정 요청",
    naver_integration_updated:     "네이버 연동 설정 저장",
    naver_designer_mapping_updated:"네이버 디자이너 매핑 저장",
    naver_service_mapping_updated: "네이버 시술 매핑 저장",
    naver_ready_status_changed:    "네이버 연동 상태 변경",
    user_role_updated:             "직원 역할 변경",
    user_active_status_updated:    "직원 활성 상태 변경",
    user_designer_linked:          "디자이너 연결",
    user_permission_viewed:        "직원 관리 열람",
    qa_write_test:                 "QA write test",
    permission_denied:             "권한 거부",
    security_rule_error:           "보안 규칙 오류",
  };
  return map[action] ?? action;
}

function isInDateRange(val: unknown, range: string): boolean {
  if (range === "all") return true;
  const d = toDate(val);
  if (!d) return true;
  const now  = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today")  return d >= today;
  if (range === "7days")  return d >= new Date(today.getTime() - 6  * 24 * 60 * 60 * 1000);
  if (range === "30days") return d >= new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  return true;
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const { user, userData, loading: authLoading, firebaseReady } = useAuth();
  const router = useRouter();

  const salonId  = userData?.salonId ?? null;
  const role     = userData?.role ?? "designer";
  const isOwner  = role === "owner";
  const isOM     = role === "owner" || role === "manager";

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("logs");

  // ── Access log state ─────────────────────────────────────────────────────
  const [actionFilter, setActionFilter] = useState("");
  const [dateFilter,   setDateFilter]   = useState("7days");
  const [userFilter,   setUserFilter]   = useState("");
  const [logs,    setLogs]    = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Privacy settings (UI toggles only) ───────────────────────────────────
  const [maskPhone,  setMaskPhone]  = useState(true);
  const [logAccess,  setLogAccess]  = useState(true);

  // ── Staff state ───────────────────────────────────────────────────────────
  const [staffList,    setStaffList]    = useState<StaffMember[]>([]);
  const [designers,    setDesigners]    = useState<Designer[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError,   setStaffError]   = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const staffViewedLogged = useRef(false);

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editingUid,    setEditingUid]    = useState<string | null>(null);
  const [editRole,      setEditRole]      = useState<UserRole>("designer");
  const [editIsActive,  setEditIsActive]  = useState(true);
  const [editDesignerId, setEditDesignerId] = useState("");
  const [editSaving,    setEditSaving]    = useState(false);
  const [editError,     setEditError]     = useState<string | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Auth redirect ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && firebaseReady && !user) {
      router.replace("/login");
    }
  }, [authLoading, firebaseReady, user, router]);

  // ── Load access logs ──────────────────────────────────────────────────────
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
        limit(200),
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

  // ── Load staff ────────────────────────────────────────────────────────────
  const loadStaff = useCallback(async () => {
    if (!salonId) return;
    setStaffLoading(true);
    setStaffError(null);
    try {
      const [s, d] = await Promise.all([
        getStaffMembers(salonId),
        getDesigners(salonId),
      ]);
      setStaffList(s);
      setDesigners(d);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === "permission-denied") {
        setStaffError("접근 권한이 없습니다. 원장 계정으로 확인하세요.");
      } else {
        setStaffError(err.message ?? "직원 목록을 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setStaffLoading(false);
    }
  }, [salonId]);

  // staff 탭 진입 시 → 로드 + 접근 로그 기록 (최초 1회)
  useEffect(() => {
    if (activeTab !== "staff" || !salonId || !isOM) return;
    if (staffList.length === 0 && !staffLoading && !staffError) {
      loadStaff();
    }
    if (isOwner && userData && !staffViewedLogged.current) {
      staffViewedLogged.current = true;
      logStaffAccess(
        salonId,
        "user_permission_viewed",
        "all",
        { uid: userData.uid, name: userData.name, role: ROLE_KR[role as UserRole] as RoleKr },
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, salonId, isOM]);

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
      total:           recent.length,
      privateViewed:   recent.filter((l) => l.action === "customer_private_viewed").length,
      reservationMod:  recent.filter((l) =>
        l.action === "reservation_status_changed" ||
        l.action === "reservation_cancelled" ||
        l.action === "reservation_no_show",
      ).length,
      customerUpdated: recent.filter((l) => l.action === "customer_updated").length,
      qaWriteTest:     recent.filter((l) => l.action === "qa_write_test").length,
      permDenied:      recent.filter((l) =>
        l.action === "permission_denied" || l.action === "security_rule_error",
      ).length,
    };
  }, [logs]);

  // ── Staff helpers ─────────────────────────────────────────────────────────
  const designerName = (designerId?: string | null) => {
    if (!designerId) return null;
    return designers.find((d) => d.id === designerId)?.name ?? designerId;
  };

  const visibleStaff = showInactive
    ? staffList
    : staffList.filter((s) => s.isActive !== false);

  // ── Edit modal handlers ───────────────────────────────────────────────────
  const openEdit = (s: StaffMember) => {
    setEditingUid(s.uid);
    setEditRole(s.role);
    setEditIsActive(s.isActive !== false);
    setEditDesignerId(s.designerId ?? "");
    setEditError(null);
  };

  const closeEdit = () => {
    setEditingUid(null);
    setEditError(null);
  };

  const handleEditSave = async () => {
    if (!editingUid || !salonId || !userData) return;
    const target = staffList.find((s) => s.uid === editingUid);
    if (!target) return;

    // Guard: 자기 자신 비활성화 불가
    if (editingUid === userData.uid && !editIsActive) {
      setEditError("자기 자신을 비활성화할 수 없습니다.");
      return;
    }
    // Guard: 마지막 owner 역할 변경 불가
    if (target.role === "owner" && editRole !== "owner") {
      const otherOwners = staffList.filter(
        (s) => s.role === "owner" && s.uid !== editingUid,
      );
      if (otherOwners.length === 0) {
        setEditError("마지막 원장의 역할은 변경할 수 없습니다.");
        return;
      }
    }

    setEditSaving(true);
    setEditError(null);

    try {
      const logUser = {
        uid: userData.uid,
        name: userData.name,
        role: ROLE_KR[role as UserRole] as RoleKr,
      };

      if (editRole !== target.role) {
        await updateStaffRole(editingUid, editRole);
        logStaffAccess(salonId, "user_role_updated", editingUid, logUser);
      }

      if ((editIsActive !== false) !== (target.isActive !== false)) {
        await updateStaffActive(editingUid, editIsActive);
        logStaffAccess(salonId, "user_active_status_updated", editingUid, logUser);
      }

      const newDesignerId = editRole === "designer" ? (editDesignerId || null) : null;
      const oldDesignerId = target.designerId ?? null;
      if (newDesignerId !== oldDesignerId) {
        await updateStaffDesignerLink(editingUid, newDesignerId);
        logStaffAccess(salonId, "user_designer_linked", editingUid, logUser);
      }

      await loadStaff();
      closeEdit();
      showToast("success", "직원 정보가 저장됐습니다.");
    } catch (e: unknown) {
      const err = e as { message?: string };
      setEditError(err.message ?? "저장 중 오류가 발생했습니다.");
    } finally {
      setEditSaving(false);
    }
  };

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
            현재 역할:{" "}
            <span className="font-semibold">{roleLabel(role)}</span>
          </p>
        </div>
      </AdminLayout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout
      title="보안 및 권한 관리"
      description="고객 개인정보 보호와 직원별 권한을 관리하세요."
    >
      <div className="space-y-6">

        {/* ── 상단 배너 ── */}
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

        {/* ── 탭 네비게이션 ── */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-auto sm:inline-flex">
          {(
            [
              { value: "logs",        label: "접근 로그",  icon: Eye },
              { value: "permissions", label: "권한 안내",  icon: Shield },
              { value: "staff",       label: "직원 관리",  icon: Users },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none justify-center ${
                activeTab === value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════
            탭: 접근 로그
        ════════════════════════════════════════════ */}
        {activeTab === "logs" && (
          <>
            {/* 보안 요약 카드 (최근 7일) */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Clock size={14} className="text-blue-500" />
                보안 요약 — 최근 7일
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "전체 접근 로그",  value: stats.total,           color: "text-blue-600",   bg: "bg-blue-50" },
                  { label: "원본 연락처 조회", value: stats.privateViewed,   color: "text-amber-600",  bg: "bg-amber-50",  warn: stats.privateViewed > 0 },
                  { label: "예약 수정/취소",   value: stats.reservationMod,  color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "고객 정보 수정",   value: stats.customerUpdated, color: "text-indigo-600", bg: "bg-indigo-50" },
                  { label: "QA write test",   value: stats.qaWriteTest,     color: "text-green-600",  bg: "bg-green-50" },
                  { label: "권한 오류",        value: stats.permDenied,      color: "text-red-600",    bg: "bg-red-50",    warn: stats.permDenied > 0 },
                ].map(({ label, value, color, bg, warn }) => (
                  <div
                    key={label}
                    className={`rounded-xl p-3 text-center border ${
                      warn
                        ? "border-amber-200 bg-amber-50"
                        : `${bg} border-transparent`
                    }`}
                  >
                    <p className="text-[11px] text-gray-500 leading-tight mb-1">{label}</p>
                    <p className={`text-2xl font-bold tabular-nums ${warn ? "text-amber-600" : color}`}>
                      {value}
                    </p>
                    {warn && value > 0 && (
                      <p className="text-[10px] text-amber-500 mt-0.5">주의</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 접근 로그 */}
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
                      onClick={() => {
                        setActionFilter("");
                        setUserFilter("");
                        setDateFilter("all");
                      }}
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
                                · {log.targetType}
                                {log.targetId ? ` #${log.targetId.slice(0, 8)}` : ""}
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
          </>
        )}

        {/* ════════════════════════════════════════════
            탭: 권한 안내
        ════════════════════════════════════════════ */}
        {activeTab === "permissions" && (
          <>
            {/* 개인정보 보호 설정 + 역할별 권한 테이블 */}
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
                        { item: "이름 (필수)",      purpose: "예약 서비스 제공" },
                        { item: "전화번호 (필수)",  purpose: "예약 알림 발송" },
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

              {/* 역할별 권한 테이블 */}
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
                          <th
                            key={r}
                            className="px-4 py-3 text-center text-xs font-medium text-gray-500"
                          >
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

            {/* 역할 상세 설명 */}
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
                  <div
                    className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${section.bg} ${section.color}`}
                  >
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

            {/* 개인정보 처리 방침 요약 */}
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
                <div
                  key={section.title}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                >
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

            {/* QA 검수센터 링크 (owner 전용) */}
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
          </>
        )}

        {/* ════════════════════════════════════════════
            탭: 직원 관리
        ════════════════════════════════════════════ */}
        {activeTab === "staff" && (
          <>
            {/* 직원 목록 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* 헤더 */}
              <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <Users size={15} className="text-blue-600" />
                  직원 목록
                  {!staffLoading && staffList.length > 0 && (
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      ({visibleStaff.length}
                      {!showInactive && staffList.some((s) => !s.isActive)
                        ? `/${staffList.length}`
                        : ""}명)
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-3">
                  {/* 비활성 포함 토글 */}
                  {staffList.some((s) => !s.isActive) && (
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="rounded"
                      />
                      비활성 직원 포함
                    </label>
                  )}
                  {isOM && (
                    <button
                      onClick={loadStaff}
                      disabled={staffLoading}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-40"
                    >
                      <RefreshCw size={13} className={staffLoading ? "animate-spin" : ""} />
                      새로고침
                    </button>
                  )}
                </div>
              </div>

              {/* salonId 없음 가드 */}
              {!salonId && (
                <div className="flex items-start gap-3 px-5 py-6 text-sm text-amber-700 bg-amber-50 m-4 rounded-xl">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  매장 정보가 연결되지 않았습니다. 설정에서 salonId를 확인하세요.
                </div>
              )}

              {/* 로딩 */}
              {staffLoading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-blue-500" />
                </div>
              )}

              {/* 에러 */}
              {!staffLoading && staffError && (
                <div className="flex items-start gap-3 px-5 py-6 text-sm text-red-700 bg-red-50 m-4 rounded-xl">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {staffError}
                </div>
              )}

              {/* 빈 목록 */}
              {!staffLoading && !staffError && salonId && visibleStaff.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <Users size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">등록된 직원이 없습니다.</p>
                </div>
              )}

              {/* 데스크탑 테이블 */}
              {!staffLoading && !staffError && visibleStaff.length > 0 && (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {["이름", "이메일", "역할", "연결 디자이너", "상태", ""].map((h) => (
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
                        {visibleStaff.map((s) => {
                          const dName = designerName(s.designerId);
                          const isSelf = s.uid === userData?.uid;
                          return (
                            <tr
                              key={s.uid}
                              className={`hover:bg-gray-50 ${!s.isActive ? "opacity-50" : ""}`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">{s.name}</span>
                                  {isSelf && (
                                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                                      나
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">{s.email}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeClass(s.role)}`}>
                                  {roleLabel(s.role)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">
                                {dName ? (
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                    {dName}
                                  </span>
                                ) : s.role === "designer" ? (
                                  <span className="text-amber-500">미연결</span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {s.isActive !== false ? (
                                  <span className="flex items-center gap-1 text-xs text-green-600">
                                    <UserCheck size={13} />
                                    활성
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <UserX size={13} />
                                    비활성
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isOwner && (
                                  <button
                                    onClick={() => openEdit(s)}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 ml-auto"
                                  >
                                    <Pencil size={12} />
                                    수정
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 모바일 카드 */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {visibleStaff.map((s) => {
                      const dName = designerName(s.designerId);
                      const isSelf = s.uid === userData?.uid;
                      return (
                        <div
                          key={s.uid}
                          className={`px-4 py-4 ${!s.isActive ? "opacity-50" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${roleBadgeClass(s.role)}`}>
                                {roleLabel(s.role)}
                              </span>
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {s.name}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                  나
                                </span>
                              )}
                            </div>
                            {s.isActive !== false ? (
                              <span className="flex items-center gap-1 text-xs text-green-600 flex-shrink-0">
                                <UserCheck size={12} />
                                활성
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                                <UserX size={12} />
                                비활성
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{s.email}</p>
                          {s.role === "designer" && (
                            <p className="text-xs">
                              {dName ? (
                                <span className="text-gray-600">디자이너 연결: {dName}</span>
                              ) : (
                                <span className="text-amber-500">디자이너 미연결</span>
                              )}
                            </p>
                          )}
                          {isOwner && (
                            <button
                              onClick={() => openEdit(s)}
                              className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                            >
                              <Pencil size={12} />
                              수정
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* manager 읽기 전용 안내 */}
              {!isOwner && isOM && (
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Info size={12} />
                    매니저는 직원 목록 조회만 가능합니다. 수정은 원장에게 요청하세요.
                  </p>
                </div>
              )}
            </div>

            {/* 직원 초대 준비 */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Info size={17} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-0.5">직원 초대 준비</h3>
                  <p className="text-xs text-gray-500">
                    현재 MVP에서는 수동 등록 방식을 사용합니다.
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-gray-600 pl-12">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-700 flex-shrink-0">1단계</span>
                  <span>Firebase Console → Authentication에서 직원 이메일 계정 생성</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-700 flex-shrink-0">2단계</span>
                  <span>
                    Firestore <code className="bg-white/80 px-1 rounded">users/&#123;uid&#125;</code> 문서 생성:
                    {" "}<code className="bg-white/80 px-1 rounded">name, email, role, salonId, isActive: true</code>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-700 flex-shrink-0">3단계</span>
                  <span>직원이 앱에 로그인 후 이 페이지에서 역할·디자이너 연결 수정</span>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-1.5 text-gray-400">
                  <Info size={11} className="flex-shrink-0" />
                  향후 Cloud Functions 또는 Admin SDK를 통한 초대 이메일 기능 구현 예정
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* ── 수정 모달 (overlay) ── */}
      {editingUid && (() => {
        const target = staffList.find((s) => s.uid === editingUid);
        if (!target) return null;
        const isSelf = editingUid === userData?.uid;
        const activeDesigners = designers.filter((d) => d.status === "active");
        const allDesigners    = designers;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
              {/* 모달 헤더 */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">직원 정보 수정</h3>
                <button
                  onClick={closeEdit}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="px-6 py-5 space-y-5">
                {/* 비밀번호·이메일 변경 불가 안내 */}
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
                  <Info size={13} className="flex-shrink-0 mt-0.5" />
                  이메일·비밀번호는 Firebase Console에서 변경합니다. 이 화면에서는 역할·상태·디자이너 연결만 수정할 수 있습니다.
                </div>

                {/* 읽기 전용 정보 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">이름</label>
                    <p className="text-sm text-gray-900 font-medium">
                      {target.name}
                      {isSelf && (
                        <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">나</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">이메일</label>
                    <p className="text-sm text-gray-600 truncate">{target.email}</p>
                  </div>
                </div>

                {/* 역할 선택 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">역할</label>
                  <select
                    value={editRole}
                    onChange={(e) => {
                      setEditRole(e.target.value as UserRole);
                      if (e.target.value !== "designer") setEditDesignerId("");
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="owner">원장 (owner)</option>
                    <option value="manager">매니저 (manager)</option>
                    <option value="designer">디자이너 (designer)</option>
                  </select>
                  {editRole !== target.role && (
                    <p className="mt-1 text-xs text-amber-600">
                      역할이 변경됩니다: {roleLabel(target.role)} → {roleLabel(editRole)}
                    </p>
                  )}
                </div>

                {/* 디자이너 연결 (designer 역할일 때만) */}
                {editRole === "designer" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      연결 디자이너
                    </label>
                    <select
                      value={editDesignerId}
                      onChange={(e) => setEditDesignerId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— 미연결 —</option>
                      {activeDesigners.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.roleTitle})
                        </option>
                      ))}
                      {/* inactive 디자이너도 표시 (별도 구분) */}
                      {allDesigners
                        .filter((d) => d.status !== "active")
                        .map((d) => (
                          <option key={d.id} value={d.id} disabled>
                            {d.name} — {d.status === "inactive" ? "비활성" : "휴무"}
                          </option>
                        ))}
                    </select>
                    {!editDesignerId && (
                      <p className="mt-1 text-xs text-amber-500">미연결 상태입니다.</p>
                    )}
                  </div>
                )}

                {/* 활성 상태 */}
                <div className="flex items-center justify-between py-3 border border-gray-100 rounded-xl px-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">계정 활성화</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      비활성화된 계정은 주요 기능 접근이 제한됩니다.
                    </p>
                  </div>
                  <button
                    onClick={() => setEditIsActive(!editIsActive)}
                    disabled={isSelf}
                    title={isSelf ? "자기 자신을 비활성화할 수 없습니다" : undefined}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors disabled:opacity-40 ${
                      editIsActive ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        editIsActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 오류 메시지 */}
                {editError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-xs text-red-700">
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                    {editError}
                  </div>
                )}
              </div>

              {/* 모달 푸터 */}
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={closeEdit}
                  disabled={editSaving}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  취소
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {editSaving && <Loader2 size={14} className="animate-spin" />}
                  저장
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}
    </AdminLayout>
  );
}
