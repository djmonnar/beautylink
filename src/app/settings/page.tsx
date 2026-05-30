"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import {
  updateUserProfile,
  getSalon,
  updateSalon,
  sendPasswordReset,
  logSettingsAccess,
  type SalonUpdate,
} from "@/services/settings";
import type { Salon } from "@/types";
import {
  User,
  Building2,
  ShieldCheck,
  KeyRound,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// ── 상수 ─────────────────────────────────────────────────────────────────────

type Tab = "profile" | "salon" | "permissions" | "password";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",     label: "내 정보",       icon: User },
  { id: "salon",       label: "매장 정보",     icon: Building2 },
  { id: "permissions", label: "권한 정보",     icon: ShieldCheck },
  { id: "password",    label: "비밀번호 변경", icon: KeyRound },
];

const ROLE_LABEL: Record<string, string> = {
  owner:   "원장",
  manager: "매니저",
  designer: "디자이너",
};

const ROLE_MAP = {
  owner:   "원장",
  manager: "매니저",
  designer: "디자이너",
} as const;

const ROLE_DESC: Record<string, string> = {
  owner:   "매장의 모든 데이터에 접근하고 수정할 수 있습니다. 디자이너·메뉴 관리, 데이터 삭제, 설정 변경이 가능합니다.",
  manager: "예약·고객 관리, 디자이너·메뉴 수정이 가능합니다. 데이터 삭제 및 매장 설정 변경은 원장만 가능합니다.",
  designer: "본인 예약 조회 및 고객 기본정보 읽기만 가능합니다. 데이터 수정은 원장·매니저에게 문의하세요.",
};

const PLAN_LABEL: Record<string, string> = {
  free: "무료",
  starter: "스타터",
  pro: "프로",
};

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

// ── 공통 스타일 ───────────────────────────────────────────────────────────────

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow";
const inputROCls =
  "w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed";
const inputTimeCls =
  "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow";
const inputTimeROCls =
  "w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed";

// ── 파생 문자열 생성 ──────────────────────────────────────────────────────────

function deriveBusinessHoursString(form: SalonUpdate): string {
  const parts: string[] = [];
  if (form.weekdayStart && form.weekdayEnd) {
    parts.push(`평일 ${form.weekdayStart}~${form.weekdayEnd}`);
  }
  if (form.weekendStart && form.weekendEnd) {
    parts.push(`주말 ${form.weekendStart}~${form.weekendEnd}`);
  }
  if (form.regularClosedDays && form.regularClosedDays.length > 0) {
    const closed = form.regularClosedDays.map((d) => DAY_NAMES[d]).join("·");
    parts.push(`휴무 ${closed}요일`);
  }
  return parts.join(" / ") || form.businessHours || "";
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, userData, refreshUserData } = useAuth();
  const salonId = userData?.salonId ?? null;
  const isOwner = userData?.role === "owner";

  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // ── 내 정보 ─────────────────────────────────────────────────
  const [profileName, setProfileName]   = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── 매장 정보 ────────────────────────────────────────────────
  const [salon, setSalon]               = useState<Salon | null>(null);
  const [salonForm, setSalonForm]       = useState<SalonUpdate>({});
  const [salonLoading, setSalonLoading] = useState(false);
  const [salonSaving, setSalonSaving]   = useState(false);
  const [salonMsg, setSalonMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  // ── 비밀번호 ─────────────────────────────────────────────────
  const [pwSending, setPwSending] = useState(false);
  const [pwMsg, setPwMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  // ── 초기값 세팅 ──────────────────────────────────────────────
  useEffect(() => {
    if (userData) {
      setProfileName(userData.name ?? "");
      setProfilePhone(userData.phoneMasked ?? "");
    }
  }, [userData]);

  // ── 매장 정보 로드 (탭 전환 시) ───────────────────────────────
  useEffect(() => {
    if (activeTab !== "salon" || !salonId) return;
    setSalonLoading(true);
    getSalon(salonId).then((s) => {
      setSalon(s);
      if (s) {
        setSalonForm({
          name:              s.name ?? "",
          phone:             s.phone ?? "",
          address:           s.address ?? "",
          businessHours:     s.businessHours ?? "",
          weekdayStart:      s.weekdayStart ?? "",
          weekdayEnd:        s.weekdayEnd ?? "",
          weekendStart:      s.weekendStart ?? "",
          weekendEnd:        s.weekendEnd ?? "",
          regularClosedDays: s.regularClosedDays ?? [],
          description:       s.description ?? "",
          naverPlaceUrl:     s.naverPlaceUrl ?? "",
        });
      }
      setSalonLoading(false);
    });
  }, [activeTab, salonId]);

  // ── 탭 전환 (메시지 초기화) ────────────────────────────────────
  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setProfileMsg(null);
    setSalonMsg(null);
    setPwMsg(null);
  }

  // ── 내 정보 저장 ──────────────────────────────────────────────
  async function handleProfileSave() {
    if (!user) return;
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateUserProfile(user.uid, {
        name:         profileName.trim() || undefined,
        phoneMasked:  profilePhone.trim() || undefined,
      });
      await refreshUserData();
      setProfileMsg({ ok: true, text: "내 정보가 저장되었습니다." });
      if (salonId && userData) {
        logSettingsAccess(salonId, "user_profile_updated", user.uid, userData.name, ROLE_MAP[userData.role]);
      }
    } catch {
      setProfileMsg({ ok: false, text: "저장에 실패했습니다. 다시 시도해주세요." });
    } finally {
      setProfileSaving(false);
    }
  }

  // ── 매장 정보 저장 ────────────────────────────────────────────
  async function handleSalonSave() {
    if (!salonId || !userData) return;
    setSalonSaving(true);
    setSalonMsg(null);
    try {
      const derived = deriveBusinessHoursString(salonForm);
      await updateSalon(salonId, { ...salonForm, businessHours: derived });
      setSalonMsg({ ok: true, text: "매장 정보가 저장되었습니다." });
      logSettingsAccess(salonId, "salon_info_updated", userData.uid, userData.name, ROLE_MAP[userData.role]);
    } catch {
      setSalonMsg({ ok: false, text: "저장에 실패했습니다. 다시 시도해주세요." });
    } finally {
      setSalonSaving(false);
    }
  }

  // ── 비밀번호 재설정 이메일 ─────────────────────────────────────
  async function handlePasswordReset() {
    if (!user?.email) return;
    setPwSending(true);
    setPwMsg(null);
    try {
      await sendPasswordReset(user.email);
      setPwMsg({ ok: true, text: `${user.email}로 비밀번호 재설정 링크를 발송했습니다.` });
      if (salonId && userData && user) {
        logSettingsAccess(salonId, "password_reset_requested", user.uid, userData.name, ROLE_MAP[userData.role]);
      }
    } catch {
      setPwMsg({ ok: false, text: "이메일 발송에 실패했습니다. 다시 시도해주세요." });
    } finally {
      setPwSending(false);
    }
  }

  // ── 렌더링 헬퍼 ──────────────────────────────────────────────

  function MsgBanner({ msg }: { msg: { ok: boolean; text: string } | null }) {
    if (!msg) return null;
    return (
      <div
        className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
          msg.ok
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}
      >
        {msg.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
        {msg.text}
      </div>
    );
  }

  function SaveBtn({
    onClick,
    saving,
    disabled,
    label = "저장하기",
  }: {
    onClick: () => void;
    saving: boolean;
    disabled?: boolean;
    label?: string;
  }) {
    return (
      <button
        onClick={onClick}
        disabled={saving || disabled}
        className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            저장 중...
          </>
        ) : (
          label
        )}
      </button>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AdminLayout title="설정" description="내 정보와 매장 정보를 관리합니다.">
      <div className="space-y-4">

        {/* ── 모바일 탭 (md 미만) ──────────────────────────────── */}
        <div className="md:hidden overflow-x-auto">
          <div className="flex gap-2 pb-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => switchTab(id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  activeTab === id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 메인 레이아웃 ──────────────────────────────────────── */}
        <div className="flex gap-6 items-start">

          {/* 데스크탑 사이드바 */}
          <div className="hidden md:block w-44 flex-shrink-0">
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 space-y-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => switchTab(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">

              {/* ════════════════════════════════════════════════════
                  내 정보 탭
              ════════════════════════════════════════════════════ */}
              {activeTab === "profile" && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-5">내 정보</h2>

                  <div className="space-y-4">
                    {/* 이름 (수정 가능) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        이름
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="이름을 입력해주세요"
                        className={inputCls}
                      />
                    </div>

                    {/* 이메일 (읽기 전용) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        이메일
                      </label>
                      <input
                        type="text"
                        value={user?.email ?? ""}
                        readOnly
                        className={inputROCls}
                      />
                      <p className="text-xs text-gray-400 mt-1">이메일은 변경할 수 없습니다.</p>
                    </div>

                    {/* 연락처 (수정 가능 — 마스킹 값) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        연락처
                      </label>
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="010-****-0000"
                        className={inputCls}
                      />
                    </div>

                    <MsgBanner msg={profileMsg} />

                    <SaveBtn onClick={handleProfileSave} saving={profileSaving} />

                    {/* 계정 정보 (읽기 전용) */}
                    <div className="border-t border-gray-100 pt-4 mt-2">
                      <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                        계정 정보
                      </p>
                      <div className="space-y-0 divide-y divide-gray-50">
                        {[
                          {
                            label: "역할",
                            value: userData?.role ? ROLE_LABEL[userData.role] : "-",
                            badge: true,
                          },
                          {
                            label: "매장 ID",
                            value: userData?.salonId ?? "(미연결)",
                            badge: false,
                          },
                          {
                            label: "디자이너 ID",
                            value: userData?.designerId ?? "(관리자 계정)",
                            badge: false,
                          },
                          {
                            label: "계정 상태",
                            value: userData?.isActive !== false ? "활성" : "비활성",
                            badge: false,
                          },
                        ].map(({ label, value, badge }) => (
                          <div key={label} className="flex items-center justify-between py-2.5">
                            <span className="text-xs text-gray-400">{label}</span>
                            {badge ? (
                              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                {value}
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-gray-600 max-w-[180px] truncate text-right">
                                {value}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════
                  매장 정보 탭
              ════════════════════════════════════════════════════ */}
              {activeTab === "salon" && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold text-gray-900">매장 정보</h2>
                    {!isOwner && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                        원장만 수정 가능
                      </span>
                    )}
                  </div>

                  {!salonId ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                      <p className="text-sm text-amber-700 font-medium">매장 정보가 연결되지 않았습니다.</p>
                      <p className="text-xs text-amber-500 mt-1">
                        관리자에게 users/{user?.uid ?? "—"}.salonId 설정을 요청해주세요.
                      </p>
                    </div>
                  ) : salonLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={24} className="animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* 기본 정보 — 2열 (sm 이상) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">매장명</label>
                          <input
                            type="text"
                            value={salonForm.name ?? ""}
                            onChange={(e) => setSalonForm({ ...salonForm, name: e.target.value })}
                            placeholder="매장 이름"
                            readOnly={!isOwner}
                            className={isOwner ? inputCls : inputROCls}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">대표 전화</label>
                          <input
                            type="text"
                            value={salonForm.phone ?? ""}
                            onChange={(e) => setSalonForm({ ...salonForm, phone: e.target.value })}
                            placeholder="02-0000-0000"
                            readOnly={!isOwner}
                            className={isOwner ? inputCls : inputROCls}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">주소</label>
                        <input
                          type="text"
                          value={salonForm.address ?? ""}
                          onChange={(e) => setSalonForm({ ...salonForm, address: e.target.value })}
                          placeholder="서울시 강남구 테헤란로 123"
                          readOnly={!isOwner}
                          className={isOwner ? inputCls : inputROCls}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">소개</label>
                        <input
                          type="text"
                          value={salonForm.description ?? ""}
                          onChange={(e) => setSalonForm({ ...salonForm, description: e.target.value })}
                          placeholder="매장 소개를 입력해주세요"
                          readOnly={!isOwner}
                          className={isOwner ? inputCls : inputROCls}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          네이버 플레이스 URL
                        </label>
                        <input
                          type="text"
                          value={salonForm.naverPlaceUrl ?? ""}
                          onChange={(e) => setSalonForm({ ...salonForm, naverPlaceUrl: e.target.value })}
                          placeholder="https://naver.me/..."
                          readOnly={!isOwner}
                          className={isOwner ? inputCls : inputROCls}
                        />
                      </div>

                      {/* ── 영업시간 구조화 UI ─────────────────────── */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          영업시간 설정
                        </label>
                        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40 space-y-4">

                          {/* 평일 */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">평일 (월~금)</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[11px] text-gray-400 mb-1">시작</p>
                                <input
                                  type="time"
                                  value={salonForm.weekdayStart ?? ""}
                                  onChange={(e) =>
                                    setSalonForm({ ...salonForm, weekdayStart: e.target.value })
                                  }
                                  disabled={!isOwner}
                                  className={isOwner ? inputTimeCls : inputTimeROCls}
                                />
                              </div>
                              <div>
                                <p className="text-[11px] text-gray-400 mb-1">종료</p>
                                <input
                                  type="time"
                                  value={salonForm.weekdayEnd ?? ""}
                                  onChange={(e) =>
                                    setSalonForm({ ...salonForm, weekdayEnd: e.target.value })
                                  }
                                  disabled={!isOwner}
                                  className={isOwner ? inputTimeCls : inputTimeROCls}
                                />
                              </div>
                            </div>
                          </div>

                          {/* 주말 */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">주말 (토~일)</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[11px] text-gray-400 mb-1">시작</p>
                                <input
                                  type="time"
                                  value={salonForm.weekendStart ?? ""}
                                  onChange={(e) =>
                                    setSalonForm({ ...salonForm, weekendStart: e.target.value })
                                  }
                                  disabled={!isOwner}
                                  className={isOwner ? inputTimeCls : inputTimeROCls}
                                />
                              </div>
                              <div>
                                <p className="text[11px] text-gray-400 mb-1">종료</p>
                                <input
                                  type="time"
                                  value={salonForm.weekendEnd ?? ""}
                                  onChange={(e) =>
                                    setSalonForm({ ...salonForm, weekendEnd: e.target.value })
                                  }
                                  disabled={!isOwner}
                                  className={isOwner ? inputTimeCls : inputTimeROCls}
                                />
                              </div>
                            </div>
                          </div>

                          {/* 정기 휴무 요일 */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">정기 휴무일</p>
                            <div className="flex gap-1.5 flex-wrap">
                              {DAY_NAMES.map((dayName, dow) => {
                                const isSelected = (salonForm.regularClosedDays ?? []).includes(dow);
                                return (
                                  <button
                                    key={dow}
                                    type="button"
                                    disabled={!isOwner}
                                    onClick={() => {
                                      if (!isOwner) return;
                                      const current = salonForm.regularClosedDays ?? [];
                                      setSalonForm({
                                        ...salonForm,
                                        regularClosedDays: isSelected
                                          ? current.filter((d) => d !== dow)
                                          : [...current, dow].sort((a, b) => a - b),
                                      });
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                      isSelected
                                        ? "bg-orange-500 text-white border-orange-500"
                                        : "border-gray-200 text-gray-600"
                                    } ${
                                      isOwner
                                        ? "hover:border-orange-300 cursor-pointer"
                                        : "opacity-60 cursor-not-allowed"
                                    }`}
                                  >
                                    {dayName}
                                  </button>
                                );
                              })}
                            </div>
                            {(salonForm.regularClosedDays ?? []).length > 0 && (
                              <p className="text-xs text-orange-600 mt-2">
                                매주{" "}
                                {(salonForm.regularClosedDays ?? []).map((d) => DAY_NAMES[d]).join("·")}
                                요일 정기 휴무
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 요금제 (읽기 전용) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">요금제</label>
                        <div className="flex items-center gap-2 border border-gray-100 rounded-xl px-4 py-2.5 bg-gray-50">
                          <span className="text-sm text-gray-500">
                            {salon?.plan ? PLAN_LABEL[salon.plan] : "-"} 플랜
                          </span>
                          <span className="ml-auto text-xs text-blue-600 font-medium">
                            {salon?.plan === "pro" ? "이용 중" : "업그레이드"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">요금제 변경은 고객센터에 문의해주세요.</p>
                      </div>

                      <MsgBanner msg={salonMsg} />

                      {isOwner && <SaveBtn onClick={handleSalonSave} saving={salonSaving} />}
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════════════════════════════════════════
                  권한 정보 탭
              ════════════════════════════════════════════════════ */}
              {activeTab === "permissions" && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-5">권한 정보</h2>

                  {/* 현재 역할 카드 */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {(userData?.name ?? user?.email ?? "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {userData?.name ?? user?.email?.split("@")[0]}
                        </p>
                        <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full mt-0.5">
                          {userData?.role ? ROLE_LABEL[userData.role] : "-"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mt-2">
                      {userData?.role ? ROLE_DESC[userData.role] : ""}
                    </p>
                  </div>

                  {/* 권한 요약 테이블 */}
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">역할별 권한 요약</h3>
                  <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-2/5">기능</th>
                          <th className="text-center px-2 py-2.5 font-semibold text-gray-600">원장</th>
                          <th className="text-center px-2 py-2.5 font-semibold text-gray-600">매니저</th>
                          <th className="text-center px-2 py-2.5 font-semibold text-gray-600">디자이너</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(
                          [
                            ["매장 정보 수정",  true, false,    false],
                            ["디자이너 관리",   true, true,     false],
                            ["시술 메뉴 관리",  true, true,     false],
                            ["고객 기본정보",   true, true,     "읽기만"],
                            ["고객 민감정보",   true, true,     false],
                            ["예약 전체 관리",  true, true,     "본인만"],
                            ["메시지 관리",     true, true,     false],
                            ["접근 로그 조회",  true, true,     false],
                            ["설정 편집",       true, "내 정보만", "내 정보만"],
                          ] as [string, boolean | string, boolean | string, boolean | string][]
                        ).map(([feature, owner, manager, designer], i) => (
                          <tr
                            key={i}
                            className={`${
                              (userData?.role === "owner" && owner === true) ||
                              (userData?.role === "manager" && manager !== false) ||
                              (userData?.role === "designer" && designer !== false)
                                ? "bg-blue-50/30"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-2.5 text-gray-700">{feature}</td>
                            {([owner, manager, designer] as (boolean | string)[]).map((v, ci) => (
                              <td key={ci} className="px-2 py-2.5 text-center">
                                {v === true ? (
                                  <span className="text-green-500 font-bold">✓</span>
                                ) : v === false ? (
                                  <span className="text-gray-300">–</span>
                                ) : (
                                  <span className="text-amber-500 text-[10px] font-medium">{v}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-gray-400 mt-4">
                    권한 변경은 원장님이 보안 및 권한 관리 페이지에서 처리해야 합니다.
                  </p>
                </div>
              )}

              {/* ════════════════════════════════════════════════════
                  비밀번호 변경 탭
              ════════════════════════════════════════════════════ */}
              {activeTab === "password" && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-2">비밀번호 변경</h2>
                  <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                    가입한 이메일 주소로 비밀번호 재설정 링크를 발송합니다.
                    링크를 클릭해 새 비밀번호를 설정하세요.
                  </p>

                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6">
                    <p className="text-xs text-gray-500 mb-1">재설정 링크를 발송할 이메일</p>
                    <p className="text-sm font-semibold text-gray-900">{user?.email}</p>
                  </div>

                  <MsgBanner msg={pwMsg} />

                  <div className={pwMsg ? "mt-4" : ""}>
                    <button
                      onClick={handlePasswordReset}
                      disabled={pwSending || pwMsg?.ok === true}
                      className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {pwSending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          발송 중...
                        </>
                      ) : pwMsg?.ok ? (
                        <>
                          <CheckCircle size={14} />
                          이메일 발송 완료
                        </>
                      ) : (
                        "비밀번호 재설정 이메일 보내기"
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 mt-3 text-center">
                    이메일이 오지 않으면 스팸함을 확인해주세요.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
