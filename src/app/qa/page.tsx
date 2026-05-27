"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getCountFromServer,
  addDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Shield,
  Database,
  User,
  BarChart3,
  FlaskConical,
  Copy,
  Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type CheckStatus = "idle" | "pending" | "ok" | "error" | "warning";
type WriteStatus = "idle" | "pending" | "ok" | "error";

interface CollectionCheck {
  label: string;
  path: string;
  status: CheckStatus;
  error?: string;
  count?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CheckStatus }) {
  if (status === "idle")
    return <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">대기</span>;
  if (status === "pending")
    return (
      <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
        <Loader2 size={11} className="animate-spin" />검사 중
      </span>
    );
  if (status === "ok")
    return (
      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
        <CheckCircle size={11} />정상
      </span>
    );
  if (status === "warning")
    return (
      <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
        <AlertTriangle size={11} />경고
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
      <XCircle size={11} />오류
    </span>
  );
}

function errorLabel(code?: string, message?: string): string {
  if (!code && !message) return "알 수 없는 오류";
  if (code === "permission-denied") return "permission-denied — Firestore 규칙에서 접근이 거부됨";
  if (code === "unavailable") return "Firestore 서비스 연결 불가";
  if (code === "not-found") return "문서 없음";
  return message ?? code ?? "알 수 없는 오류";
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function QAPage() {
  const { user, userData, loading: authLoading, firebaseReady } = useAuth();
  const router = useRouter();

  const salonId = userData?.salonId ?? null;

  const [checking, setChecking]         = useState(false);
  const [lastChecked, setLastChecked]   = useState<Date | null>(null);
  const [checks, setChecks]             = useState<CollectionCheck[]>([]);
  const [counts, setCounts]             = useState<Record<string, number | undefined>>({});
  const [writeStatus, setWriteStatus]   = useState<WriteStatus>("idle");
  const [writeError, setWriteError]     = useState<string | null>(null);
  const [copied, setCopied]             = useState<string | null>(null);

  // ── Auth redirect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && firebaseReady && !user) {
      router.replace("/login");
    }
  }, [authLoading, firebaseReady, user, router]);

  // ── Run checks ────────────────────────────────────────────────────────
  const runChecks = useCallback(async () => {
    if (!salonId || !user || !db) return;

    setChecking(true);
    setChecks([]);
    setCounts({});

    const todayStr = new Date().toISOString().split("T")[0];

    // Doc paths (2 segments) vs collection paths (3 segments)
    const DOC_PATHS = new Set([`users/${user.uid}`, `salons/${salonId}`]);

    const targets: { label: string; path: string }[] = [
      { label: "users/{uid}",             path: `users/${user.uid}` },
      { label: "salons/{salonId}",        path: `salons/${salonId}` },
      { label: "customers",               path: `salons/${salonId}/customers` },
      { label: "designers",               path: `salons/${salonId}/designers` },
      { label: "services",               path: `salons/${salonId}/services` },
      { label: "reservations",            path: `salons/${salonId}/reservations` },
      { label: "messageTemplates",        path: `salons/${salonId}/messageTemplates` },
      { label: "messageLogs",            path: `salons/${salonId}/messageLogs` },
      { label: "accessLogs",             path: `salons/${salonId}/accessLogs` },
    ];

    // Mark all as pending
    setChecks(targets.map((t) => ({ ...t, status: "pending" })));

    const results = await Promise.allSettled(
      targets.map(async ({ label, path }) => {
        try {
          if (DOC_PATHS.has(path)) {
            // Document check
            const snap = await getDoc(doc(db!, path));
            return {
              label,
              path,
              status: snap.exists() ? ("ok" as CheckStatus) : ("warning" as CheckStatus),
              error: snap.exists() ? undefined : "문서가 존재하지 않습니다.",
              count: undefined,
            };
          } else {
            // Collection check — getCountFromServer
            const coll = collection(db!, path);
            const snap = await getCountFromServer(coll);
            return {
              label,
              path,
              status: "ok" as CheckStatus,
              count: snap.data().count,
            };
          }
        } catch (e: unknown) {
          const err = e as { code?: string; message?: string };
          return {
            label,
            path,
            status: "error" as CheckStatus,
            error: errorLabel(err.code, err.message),
          };
        }
      })
    );

    const newChecks: CollectionCheck[] = results.map((r, i) =>
      r.status === "fulfilled"
        ? (r.value as CollectionCheck)
        : { ...targets[i], status: "error", error: "Unexpected error" }
    );

    setChecks(newChecks);

    // Build counts from collection checks
    const newCounts: Record<string, number | undefined> = {};
    for (const c of newChecks) {
      if (c.count !== undefined) newCounts[c.label] = c.count;
    }

    // Additional filtered counts (non-critical — ignore failures)
    const filtered = await Promise.allSettled([
      getCountFromServer(query(collection(db!, `salons/${salonId}/designers`), where("status", "==", "active"))),
      getCountFromServer(query(collection(db!, `salons/${salonId}/services`), where("active", "==", true))),
      getCountFromServer(query(collection(db!, `salons/${salonId}/reservations`), where("date", "==", todayStr))),
      getCountFromServer(query(collection(db!, `salons/${salonId}/reservations`), where("status", "==", "completed"))),
      getCountFromServer(query(collection(db!, `salons/${salonId}/reservations`), where("status", "==", "noShow"))),
      getCountFromServer(query(collection(db!, `salons/${salonId}/reservations`), where("status", "==", "cancelled"))),
    ]);

    const [actDes, actSvc, todayRes, completed, noshow, cancelled] = filtered;
    if (actDes.status    === "fulfilled") newCounts["활성 디자이너"]  = actDes.value.data().count;
    if (actSvc.status    === "fulfilled") newCounts["활성 시술 메뉴"] = actSvc.value.data().count;
    if (todayRes.status  === "fulfilled") newCounts["오늘 예약"]      = todayRes.value.data().count;
    if (completed.status === "fulfilled") newCounts["완료 예약"]      = completed.value.data().count;
    if (noshow.status    === "fulfilled") newCounts["노쇼"]           = noshow.value.data().count;
    if (cancelled.status === "fulfilled") newCounts["취소"]           = cancelled.value.data().count;

    setCounts(newCounts);
    setLastChecked(new Date());
    setChecking(false);
  }, [salonId, user]);

  // Run on mount when conditions are met
  useEffect(() => {
    if (!authLoading && user && userData?.role === "owner" && salonId && db) {
      runChecks();
    }
  }, [authLoading, user, userData, salonId, runChecks]);

  // ── Write test ────────────────────────────────────────────────────────
  async function handleWriteTest() {
    if (!salonId || !user || !userData || !db) return;
    setWriteStatus("pending");
    setWriteError(null);
    try {
      await addDoc(collection(db, `salons/${salonId}/qaChecks`), {
        createdAt: serverTimestamp(),
        userId: user.uid,
        userName: userData.name,
        role: userData.role,
        message: "QA write test",
      });
      setWriteStatus("ok");
    } catch (e: unknown) {
      const err = e as { message?: string };
      setWriteError(err.message ?? "쓰기 실패");
      setWriteStatus("error");
    }
  }

  // ── Copy helper ───────────────────────────────────────────────────────
  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  // ── Permission matrix (based on role) ────────────────────────────────
  const role = userData?.role ?? "designer";
  const isOwner   = role === "owner";
  const isOM      = role === "owner" || role === "manager";

  const permissions = [
    { label: "고객 읽기",       allowed: true },
    { label: "고객 쓰기",       allowed: isOM },
    { label: "디자이너 읽기",   allowed: true },
    { label: "디자이너 쓰기",   allowed: isOM },
    { label: "시술 메뉴 읽기",  allowed: true },
    { label: "시술 메뉴 쓰기",  allowed: isOM },
    { label: "예약 읽기",       allowed: true },
    { label: "예약 쓰기",       allowed: true },
    { label: "매장 정보 수정",  allowed: isOwner },
    { label: "/setup 접근",     allowed: isOwner },
    { label: "/qa 접근",        allowed: isOwner },
  ];

  // ── Account rows ──────────────────────────────────────────────────────
  const accountRows = user && userData ? [
    { label: "uid",        value: user.uid,               copyable: true },
    { label: "email",      value: user.email ?? "-" },
    { label: "name",       value: userData.name },
    { label: "role",       value: userData.role },
    { label: "salonId",    value: userData.salonId ?? "없음", warn: !userData.salonId },
    { label: "designerId", value: userData.designerId ?? "-" },
    { label: "isActive",   value: userData.isActive ? "활성" : "비활성", warn: !userData.isActive },
  ] : [];

  // ── Guards ────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !userData) return null;

  if (userData.role !== "owner") {
    return (
      <AdminLayout title="QA 검수센터" description="관리자 전용 진단 페이지">
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-4">
          <Shield size={48} className="text-red-300" />
          <h2 className="text-xl font-bold text-gray-700">접근 권한 없음</h2>
          <p className="text-sm text-gray-400">QA 검수센터는 원장(owner)만 접근할 수 있습니다.</p>
          <p className="text-xs text-gray-400">
            현재 역할: <span className="font-semibold">{userData.role}</span>
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (!salonId) {
    return (
      <AdminLayout title="QA 검수센터" description="관리자 전용 진단 페이지">
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-4">
          <AlertTriangle size={48} className="text-amber-400" />
          <h2 className="text-xl font-bold text-gray-700">salonId 누락</h2>
          <p className="text-sm text-gray-400">
            Firestore <code className="bg-gray-100 px-1 py-0.5 rounded">users/{user.uid}.salonId</code> 값이 없습니다.
          </p>
          <p className="text-xs text-gray-400">/setup 페이지에서 초기 설정을 완료하세요.</p>
        </div>
      </AdminLayout>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <AdminLayout title="QA 검수센터" description="Firestore 연결·데이터·권한 상태를 한 화면에서 진단합니다.">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* ── 헤더 바 ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock size={13} />
            {lastChecked
              ? `마지막 검사: ${lastChecked.toLocaleTimeString("ko-KR")}`
              : "아직 검사하지 않았습니다."}
          </div>
          <button
            onClick={runChecks}
            disabled={checking || !db}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {checking
              ? <><Loader2 size={14} className="animate-spin" />검사 중...</>
              : <><RefreshCw size={14} />다시 검사</>}
          </button>
        </div>

        {/* Firebase 미연결 경고 */}
        {!db && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">데모 모드 — Firebase 미연결</p>
              <p className="text-xs text-amber-700 mt-0.5">
                .env.local에 Firebase 설정값을 추가하면 Firestore 진단이 가능합니다.
                계정 정보와 권한 체크는 아래에서 확인할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* ── 1. 로그인 계정 상태 ── */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
            <User size={15} className="text-blue-600" /> 로그인 계정 상태
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {accountRows.map(({ label, value, copyable, warn }) => (
              <div
                key={label}
                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 ${
                  warn ? "bg-amber-50 border border-amber-200" : "bg-gray-50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className={`text-sm font-mono truncate ${warn ? "text-amber-700 font-semibold" : "text-gray-900"}`}>
                    {value}
                  </p>
                </div>
                {copyable && (
                  <button
                    onClick={() => handleCopy(value, label)}
                    title="복사"
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {copied === label
                      ? <CheckCircle size={14} className="text-green-500" />
                      : <Copy size={14} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. Firestore 연결 상태 ── */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
            <Database size={15} className="text-blue-600" /> Firestore 연결 상태
          </h2>
          {!db ? (
            <p className="text-sm text-gray-400 text-center py-4">Firebase 연결 후 진단 가능합니다.</p>
          ) : checks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              위 "다시 검사" 버튼을 눌러 시작하세요.
            </p>
          ) : (
            <div className="space-y-2">
              {checks.map((check) => (
                <div
                  key={check.path}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
                    check.status === "error"   ? "bg-red-50 border border-red-100"   :
                    check.status === "warning" ? "bg-amber-50 border border-amber-100" :
                    "bg-gray-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{check.label}</p>
                    <p className="text-[10px] text-gray-400 font-mono truncate">{check.path}</p>
                    {check.error && (
                      <p className="text-[11px] text-red-600 mt-0.5 leading-tight">{check.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {check.count !== undefined && (
                      <span className="text-xs font-bold text-blue-600 tabular-nums">{check.count}건</span>
                    )}
                    <StatusBadge status={check.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. 데이터 현황 ── */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
            <BarChart3 size={15} className="text-blue-600" /> 데이터 현황
          </h2>
          {!db ? (
            <p className="text-sm text-gray-400 text-center py-4">Firebase 연결 후 진단 가능합니다.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {([
                { label: "고객",         key: "customers" },
                { label: "디자이너",     key: "designers" },
                { label: "활성 디자이너",  key: "활성 디자이너" },
                { label: "시술 메뉴",    key: "services" },
                { label: "활성 시술 메뉴", key: "활성 시술 메뉴" },
                { label: "전체 예약",    key: "reservations" },
                { label: "오늘 예약",    key: "오늘 예약" },
                { label: "완료 예약",    key: "완료 예약" },
                { label: "노쇼",         key: "노쇼" },
                { label: "취소",         key: "취소" },
                { label: "메시지 템플릿", key: "messageTemplates" },
                { label: "메시지 로그",  key: "messageLogs" },
                { label: "접근 로그",    key: "accessLogs" },
              ] as { label: string; key: string }[]).map(({ label, key }) => {
                const val = counts[key];
                const isChecking = checking && val === undefined;
                return (
                  <div key={key} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-gray-500 mb-1 leading-tight">{label}</p>
                    {isChecking ? (
                      <Loader2 size={16} className="animate-spin text-gray-300 mx-auto" />
                    ) : (
                      <p className="text-xl font-bold text-gray-900 tabular-nums">
                        {val !== undefined ? val : "-"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 4. 권한 체크 ── */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2 text-sm">
            <Shield size={15} className="text-blue-600" /> 권한 체크
          </h2>
          <p className="text-xs text-gray-400 mb-4">현재 역할 기준: <span className="font-semibold text-gray-600">{role}</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {permissions.map(({ label, allowed }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 bg-gray-50"
              >
                <span className="text-sm text-gray-700">{label}</span>
                {allowed ? (
                  <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
                    <CheckCircle size={11} />가능
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">
                    <XCircle size={11} />불가
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. Firestore 쓰기 테스트 ── */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2 text-sm">
            <FlaskConical size={15} className="text-blue-600" /> Firestore 쓰기 테스트
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            실제 고객·예약 데이터는 변경하지 않습니다.{" "}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">
              salons/{"{salonId}"}/qaChecks
            </code>{" "}
            컬렉션에만 테스트 문서를 씁니다.
          </p>

          {writeStatus === "ok" && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 mb-3">
              <CheckCircle size={15} className="flex-shrink-0" />
              쓰기 테스트 성공 —{" "}
              <code className="text-xs">salons/{salonId}/qaChecks</code>에 저장됨
            </div>
          )}
          {writeStatus === "error" && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-3">
              <XCircle size={15} className="flex-shrink-0" />
              {writeError ?? "쓰기 실패"}
            </div>
          )}

          <button
            onClick={handleWriteTest}
            disabled={writeStatus === "pending" || !db}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {writeStatus === "pending"
              ? <><Loader2 size={14} className="animate-spin" />테스트 중...</>
              : <><FlaskConical size={14} />쓰기 테스트 실행</>}
          </button>

          {!db && (
            <p className="text-xs text-gray-400 mt-2">Firebase 연결 후 사용 가능합니다.</p>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
