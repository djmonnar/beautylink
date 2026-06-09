"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import { getDesigners } from "@/services/designers";
import { getServices } from "@/services/services";
import {
  getNaverSettings,
  saveNaverSettings,
  calcSyncReadyPercent,
  logNaverAccess,
} from "@/services/integrations";
import type {
  NaverIntegrationSettings,
  NaverDesignerMappingEntry,
  NaverServiceMappingEntry,
  Designer,
  ServiceMenu,
  PermissionRole,
} from "@/types";
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── 상수 ──────────────────────────────────────────────────────────────────
const ROLE_MAP = { owner: "원장", manager: "매니저", designer: "디자이너" } as const;

type NavStatus = "pending" | "ready" | "approved" | "disabled";

const STATUS_CONFIG: Record<NavStatus, { label: string; bannerClass: string }> = {
  pending:  { label: "준비 중",        bannerClass: "bg-amber-50 border-amber-200 text-amber-800" },
  ready:    { label: "신청 준비 완료", bannerClass: "bg-blue-50  border-blue-200  text-blue-800"  },
  approved: { label: "승인됨",         bannerClass: "bg-green-50 border-green-200 text-green-800" },
  disabled: { label: "비활성",         bannerClass: "bg-gray-50  border-gray-200  text-gray-700"  },
};

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────

function MatchBadge({ matched }: { matched: boolean }) {
  return matched ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">
      <CheckCircle size={10} /> 매핑 완료
    </span>
  ) : (
    <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full whitespace-nowrap">
      미매핑
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const color =
    value >= 90 ? "bg-green-500" :
    value >= 70 ? "bg-blue-500"  :
    value >= 40 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div
        className={`h-3 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function Toast({
  msg,
  type,
  onClose,
}: {
  msg: string;
  type?: "error";
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm text-white ${
        type === "error" ? "bg-red-600" : "bg-gray-900"
      }`}
    >
      {type === "error" ? (
        <AlertTriangle size={16} />
      ) : (
        <CheckCircle size={16} className="text-green-400" />
      )}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 text-white/60 hover:text-white">
        ✕
      </button>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function NaverIntegrationPage() {
  const { userData } = useAuth();
  const salonId = userData?.salonId ?? null;
  const role = userData?.role;
  const userRole: PermissionRole =
    ROLE_MAP[role as keyof typeof ROLE_MAP] ?? "디자이너";
  const isOwner = role === "owner";
  const isOM    = role === "owner" || role === "manager";

  // ── 데이터 상태 ─────────────────────────────────────────────────────────
  const [settings, setSettings]   = useState<NaverIntegrationSettings | null>(null);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [services, setServices]   = useState<ServiceMenu[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type?: "error" } | null>(null);

  // ── 폼 상태 ─────────────────────────────────────────────────────────────
  const [formStoreId, setFormStoreId]             = useState("");
  const [formShopName, setFormShopName]           = useState("");
  const [formNaverPlaceUrl, setFormNaverPlaceUrl] = useState("");
  const [formStatus, setFormStatus]               = useState<NavStatus>("pending");
  const [designerEdits, setDesignerEdits]         = useState<Record<string, string>>({});
  const [serviceEdits, setServiceEdits]           = useState<Record<string, string>>({});
  const [showInactiveD, setShowInactiveD]         = useState(false);
  const [showInactiveS, setShowInactiveS]         = useState(false);

  // ── 토스트 헬퍼 ────────────────────────────────────────────────────────
  const showToast = (msg: string, type?: "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── 데이터 로드 ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);
    setError(null);
    try {
      const [s, d, sv] = await Promise.all([
        getNaverSettings(salonId),
        getDesigners(salonId),
        getServices(salonId),
      ]);
      setSettings(s);
      setDesigners(d);
      setServices(sv);

      // 폼 초기화
      setFormStoreId(s.storeId ?? "");
      setFormShopName(s.shopName ?? "");
      setFormNaverPlaceUrl(s.naverPlaceUrl ?? "");
      setFormStatus((s.status ?? "pending") as NavStatus);

      // 디자이너 매핑 초기화
      const dm = s.designerMapping ?? {};
      const dEdits: Record<string, string> = {};
      for (const designer of d) {
        dEdits[designer.id] = dm[designer.id]?.naverName ?? "";
      }
      setDesignerEdits(dEdits);

      // 시술 매핑 초기화 (integrationSettings 우선, 없으면 services.naverMenuName)
      const sm = s.serviceMapping ?? {};
      const sEdits: Record<string, string> = {};
      for (const svc of sv) {
        sEdits[svc.id] = sm[svc.id]?.naverMenuName ?? svc.naverMenuName ?? "";
      }
      setServiceEdits(sEdits);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── 실시간 준비율 계산 ───────────────────────────────────────────────────
  const activeDesigners = designers.filter((d) => d.status !== "inactive");
  const activeServices  = services.filter((s) => s.active);

  const syncPercent = calcSyncReadyPercent(
    formStoreId,
    formShopName,
    formNaverPlaceUrl,
    designerEdits,
    activeDesigners.map((d) => d.id),
    serviceEdits,
    activeServices.map((s) => s.id)
  );

  const dMapped = activeDesigners.filter((d) => designerEdits[d.id]?.trim()).length;
  const sMapped = activeServices.filter((s) => serviceEdits[s.id]?.trim()).length;

  const inactiveDCount = designers.filter((d) => d.status === "inactive").length;
  const inactiveSCount = services.filter((s) => !s.active).length;

  const displayDesigners = showInactiveD
    ? designers
    : designers.filter((d) => d.status !== "inactive");
  const displayServices = showInactiveS
    ? services
    : services.filter((s) => s.active);

  // ── 저장 ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!salonId || !settings || !isOM) return;
    setSaving(true);
    try {
      const prevStatus = settings.status;

      // 디자이너 매핑 빌드 (기존 항목 보존 + 현재 목록 갱신)
      const newDesignerMapping: Record<string, NaverDesignerMappingEntry> = {
        ...(settings.designerMapping ?? {}),
      };
      for (const d of designers) {
        newDesignerMapping[d.id] = {
          internalName:   d.name,
          naverName:      designerEdits[d.id]?.trim() ?? "",
          designerStatus: d.status,
          updatedAt:      new Date().toISOString(),
        };
      }

      // 시술 매핑 빌드 (기존 항목 보존 + 현재 목록 갱신)
      const newServiceMapping: Record<string, NaverServiceMappingEntry> = {
        ...(settings.serviceMapping ?? {}),
      };
      for (const svc of services) {
        newServiceMapping[svc.id] = {
          internalName:  svc.name,
          naverMenuName: serviceEdits[svc.id]?.trim() ?? "",
          category:      svc.category,
          price:         svc.price,
          duration:      svc.duration,
          serviceActive: svc.active,
          updatedAt:     new Date().toISOString(),
        };
      }

      const newSettings: NaverIntegrationSettings = {
        ...settings,
        storeId:         formStoreId.trim(),
        shopName:        formShopName.trim(),
        naverPlaceUrl:   formNaverPlaceUrl.trim(),
        status:          formStatus,
        designerMapping: newDesignerMapping,
        serviceMapping:  newServiceMapping,
        syncReadyPercent: syncPercent,
      };

      await saveNaverSettings(salonId, newSettings, userData?.uid);

      // accessLog
      const user = {
        uid:  userData?.uid  ?? "",
        name: userData?.name ?? "",
        role: userRole,
      };
      logNaverAccess(salonId, "naver_integration_updated",        "naver", user);
      logNaverAccess(salonId, "naver_designer_mapping_updated",   "naver", user);
      logNaverAccess(salonId, "naver_service_mapping_updated",    "naver", user);
      if (formStatus !== prevStatus) {
        logNaverAccess(salonId, "naver_ready_status_changed", "naver", user);
      }

      setSettings(newSettings);
      showToast("저장되었습니다.");
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "저장에 실패했습니다.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  // ── 준비율 텍스트 ─────────────────────────────────────────────────────
  const syncHint =
    syncPercent >= 90 ? "연동 준비 완료! API 승인을 신청하세요." :
    syncPercent >= 70 ? "거의 다 됐어요! 나머지 항목을 완료하세요." :
    syncPercent >= 40 ? "준비 중입니다. 계속 진행해 주세요." :
    "기본 설정과 매핑을 완료해 주세요.";

  // ── 렌더 ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout
      title="네이버예약 연동 준비"
      description="내부 데이터 매핑과 연동 준비 상태를 관리합니다."
    >
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── 안내 배너 (상시) ─────────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
        <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 leading-relaxed">
          <span className="font-semibold">
            현재는 네이버예약 API 공식 제휴 전 단계입니다.
          </span>{" "}
          이 화면은 내부 데이터 매핑과 연동 준비 상태를 관리하기 위한 화면이며,{" "}
          실제 네이버 API 호출은 수행하지 않습니다.
        </p>
      </div>

      {/* ── salonId 가드 ─────────────────────────────────────────────── */}
      {!salonId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertTriangle size={28} className="text-amber-500 mx-auto mb-2" />
          <p className="font-semibold text-amber-900">매장 정보가 연결되지 않았습니다.</p>
          <p className="text-sm text-amber-700 mt-1">
            설정 페이지에서 매장을 먼저 연결해 주세요.
          </p>
        </div>
      )}

      {/* ── 로딩 ─────────────────────────────────────────────────────── */}
      {salonId && loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={28} className="animate-spin text-blue-500" />
          <p className="text-sm text-gray-400">데이터를 불러오는 중...</p>
        </div>
      )}

      {/* ── 에러 ─────────────────────────────────────────────────────── */}
      {salonId && !loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">데이터 로드 오류</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={load}
              className="mt-3 text-sm text-red-600 underline hover:no-underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* ── 메인 콘텐츠 ──────────────────────────────────────────────── */}
      {salonId && !loading && !error && settings && (
        <>
          {/* 현재 상태 배너 */}
          <div
            className={`border rounded-xl px-5 py-3 mb-5 flex items-center justify-between gap-3 ${
              STATUS_CONFIG[formStatus].bannerClass
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock size={15} />
              <span>
                현재 연동 상태:{" "}
                <strong>{STATUS_CONFIG[formStatus].label}</strong>
              </span>
            </div>
            <button
              onClick={load}
              className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
              title="새로고침"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* ── ① 기본 설정 + ② 연동 준비율 그리드 ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* ① 기본 설정 */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                  1
                </span>
                기본 설정
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    네이버예약 상점 ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={formStoreId}
                    onChange={(e) => setFormStoreId(e.target.value)}
                    disabled={!isOM}
                    placeholder="예: beautylink_hair_gangnam"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    네이버예약 관리자 페이지에서 확인하세요.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    매장명 <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={formShopName}
                    onChange={(e) => setFormShopName(e.target.value)}
                    disabled={!isOM}
                    placeholder="예: 뷰티링크 헤어 강남점"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    네이버 플레이스 URL
                  </label>
                  <input
                    type="url"
                    value={formNaverPlaceUrl}
                    onChange={(e) => setFormNaverPlaceUrl(e.target.value)}
                    disabled={!isOM}
                    placeholder="https://m.place.naver.com/hairshop/..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {/* 연동 상태 — owner만 수정 */}
                {isOwner ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      연동 상태
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as NavStatus)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">준비 중</option>
                      <option value="ready">신청 준비 완료</option>
                      <option value="approved">승인됨</option>
                      <option value="disabled">비활성</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      &ldquo;승인됨&rdquo;은 실제 API 승인 없이 수동으로 표시하는
                      상태입니다.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      연동 상태
                    </label>
                    <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
                      {STATUS_CONFIG[formStatus].label}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      상태 변경은 원장만 가능합니다.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ② 연동 준비율 */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                  2
                </span>
                연동 준비율
              </h3>
              <div className="text-center mb-5">
                <div className="text-5xl font-bold text-gray-900 mb-1">
                  {syncPercent}
                  <span className="text-2xl text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{syncHint}</p>
              </div>
              <ProgressBar value={syncPercent} />
              <div className="mt-5 space-y-2.5">
                {[
                  {
                    label: "상점 ID 입력",
                    pts: 20,
                    done: !!formStoreId.trim(),
                    detail: null,
                  },
                  {
                    label: "매장명 입력",
                    pts: 10,
                    done: !!formShopName.trim(),
                    detail: null,
                  },
                  {
                    label: "네이버플레이스 URL",
                    pts: 10,
                    done: !!formNaverPlaceUrl.trim(),
                    detail: null,
                  },
                  {
                    label: "디자이너 매핑",
                    pts: 30,
                    done:
                      activeDesigners.length > 0 &&
                      dMapped === activeDesigners.length,
                    detail:
                      activeDesigners.length > 0
                        ? `${dMapped}/${activeDesigners.length}명`
                        : "디자이너 없음",
                  },
                  {
                    label: "시술 메뉴 매핑",
                    pts: 30,
                    done:
                      activeServices.length > 0 &&
                      sMapped === activeServices.length,
                    detail:
                      activeServices.length > 0
                        ? `${sMapped}/${activeServices.length}개`
                        : "시술 없음",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.done ? (
                        <CheckCircle
                          size={13}
                          className="text-green-500 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-3.5 h-3.5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                      )}
                      <span
                        className={`truncate ${
                          item.done ? "text-gray-700" : "text-gray-500"
                        }`}
                      >
                        {item.label}
                        {item.detail && (
                          <span className="ml-1 text-gray-400">
                            ({item.detail})
                          </span>
                        )}
                      </span>
                    </div>
                    <span
                      className={`font-semibold ml-2 flex-shrink-0 ${
                        item.done ? "text-green-600" : "text-gray-300"
                      }`}
                    >
                      +{item.pts}
                    </span>
                  </div>
                ))}
              </div>
              {isOM && (
                <p className="text-xs text-gray-400 mt-4 text-center">
                  저장 버튼을 누르면 Firestore에 반영됩니다.
                </p>
              )}
            </div>
          </div>

          {/* ── ③ 디자이너 매핑 ────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                  3
                </span>
                디자이너 매핑
                <span className="text-sm font-normal text-gray-400">
                  {dMapped}/{activeDesigners.length}명 완료
                </span>
              </h3>
              {inactiveDCount > 0 && (
                <button
                  onClick={() => setShowInactiveD(!showInactiveD)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 flex-shrink-0"
                >
                  {showInactiveD ? (
                    <ChevronUp size={13} />
                  ) : (
                    <ChevronDown size={13} />
                  )}
                  비활성 {inactiveDCount}명{" "}
                  {showInactiveD ? "숨기기" : "보기"}
                </button>
              )}
            </div>

            {/* 데스크탑 테이블 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium">
                      내부 디자이너
                    </th>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium">
                      상태
                    </th>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium">
                      네이버예약 디자이너명
                    </th>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium">
                      매핑
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayDesigners.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-sm text-gray-400"
                      >
                        등록된 디자이너가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    displayDesigners.map((d) => (
                      <tr
                        key={d.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          d.status === "inactive" ? "opacity-50" : ""
                        }`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: d.color }}
                            >
                              {d.profileInitial}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {d.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {d.roleTitle}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              d.status === "active"
                                ? "bg-green-100 text-green-700"
                                : d.status === "off"
                                ? "bg-gray-100 text-gray-500"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {d.status === "active"
                              ? "근무"
                              : d.status === "off"
                              ? "휴무"
                              : "비활성"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            value={designerEdits[d.id] ?? ""}
                            onChange={(e) =>
                              setDesignerEdits((prev) => ({
                                ...prev,
                                [d.id]: e.target.value,
                              }))
                            }
                            disabled={!isOM}
                            placeholder="네이버예약에 등록된 디자이너명"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <MatchBadge
                            matched={!!(designerEdits[d.id]?.trim())}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 */}
            <div className="md:hidden divide-y divide-gray-50">
              {displayDesigners.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-400">
                  등록된 디자이너가 없습니다.
                </p>
              ) : (
                displayDesigners.map((d) => (
                  <div
                    key={d.id}
                    className={`px-5 py-4 ${
                      d.status === "inactive" ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: d.color }}
                        >
                          {d.profileInitial}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {d.name}
                          </p>
                          <p className="text-xs text-gray-400">{d.roleTitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            d.status === "active"
                              ? "bg-green-100 text-green-700"
                              : d.status === "off"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {d.status === "active"
                            ? "근무"
                            : d.status === "off"
                            ? "휴무"
                            : "비활성"}
                        </span>
                        <MatchBadge matched={!!(designerEdits[d.id]?.trim())} />
                      </div>
                    </div>
                    <input
                      value={designerEdits[d.id] ?? ""}
                      onChange={(e) =>
                        setDesignerEdits((prev) => ({
                          ...prev,
                          [d.id]: e.target.value,
                        }))
                      }
                      disabled={!isOM}
                      placeholder="네이버예약에 등록된 디자이너명"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── ④ 시술 메뉴 매핑 ───────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-5">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                  4
                </span>
                시술 메뉴 매핑
                <span className="text-sm font-normal text-gray-400">
                  {sMapped}/{activeServices.length}개 완료
                </span>
              </h3>
              {inactiveSCount > 0 && (
                <button
                  onClick={() => setShowInactiveS(!showInactiveS)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 flex-shrink-0"
                >
                  {showInactiveS ? (
                    <ChevronUp size={13} />
                  ) : (
                    <ChevronDown size={13} />
                  )}
                  비활성 {inactiveSCount}개{" "}
                  {showInactiveS ? "숨기기" : "보기"}
                </button>
              )}
            </div>

            {/* 데스크탑 테이블 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium">
                      시술 메뉴
                    </th>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium">
                      카테고리
                    </th>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium">
                      가격 · 소요
                    </th>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium">
                      네이버예약 메뉴명
                    </th>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium">
                      매핑
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayServices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-gray-400"
                      >
                        등록된 시술 메뉴가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    displayServices.map((svc) => (
                      <tr
                        key={svc.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          !svc.active ? "opacity-50" : ""
                        }`}
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900">{svc.name}</p>
                          {!svc.active && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              비활성
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">
                          {svc.category}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {svc.price.toLocaleString()}원 · {svc.duration}분
                        </td>
                        <td className="px-5 py-3">
                          <input
                            value={serviceEdits[svc.id] ?? ""}
                            onChange={(e) =>
                              setServiceEdits((prev) => ({
                                ...prev,
                                [svc.id]: e.target.value,
                              }))
                            }
                            disabled={!isOM}
                            placeholder="네이버예약에 등록된 메뉴명"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <MatchBadge
                            matched={!!(serviceEdits[svc.id]?.trim())}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 */}
            <div className="md:hidden divide-y divide-gray-50">
              {displayServices.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-400">
                  등록된 시술 메뉴가 없습니다.
                </p>
              ) : (
                displayServices.map((svc) => (
                  <div
                    key={svc.id}
                    className={`px-5 py-4 ${!svc.active ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {svc.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {svc.category} · {svc.price.toLocaleString()}원 ·{" "}
                          {svc.duration}분
                          {!svc.active && (
                            <span className="ml-2 text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              비활성
                            </span>
                          )}
                        </p>
                      </div>
                      <MatchBadge matched={!!(serviceEdits[svc.id]?.trim())} />
                    </div>
                    <input
                      value={serviceEdits[svc.id] ?? ""}
                      onChange={(e) =>
                        setServiceEdits((prev) => ({
                          ...prev,
                          [svc.id]: e.target.value,
                        }))
                      }
                      disabled={!isOM}
                      placeholder="네이버예약에 등록된 메뉴명"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
              <p className="text-xs text-gray-400">
                네이버예약에 등록된 메뉴명과 정확히 일치해야 합니다.
                시술 메뉴 관리 페이지에서도 네이버 메뉴명을 별도 설정할 수
                있습니다.
              </p>
            </div>
          </div>

          {/* ── 저장 영역 ───────────────────────────────────────────── */}
          {isOM ? (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  변경사항 저장
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  기본 설정, 디자이너 매핑, 시술 매핑이 함께 저장됩니다.
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <Info size={16} className="text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-500">
                연동 설정 조회만 가능합니다. 변경은 원장 또는 매니저에게
                문의하세요.
              </p>
            </div>
          )}

          {/* ── 제휴 준비 안내 ─────────────────────────────────────────── */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  네이버예약 API 제휴 준비 화면
                </p>
                <p className="text-sm text-blue-800 leading-relaxed">
                  이 화면은 네이버예약 공식 API 제휴 또는 연동 검토를 위한 사전 매핑 화면입니다.
                  <strong> 실제 API 호출은 수행하지 않으며</strong>, 제휴 승인 후 연동 범위에 따라 확장됩니다.
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  현재 저장된 디자이너·시술 매핑 정보는 제휴 승인 즉시 자동으로 연동에 활용됩니다.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
