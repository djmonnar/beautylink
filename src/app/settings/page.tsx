"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  updateUserProfile,
  getSalon,
  updateSalon,
  sendPasswordReset,
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
  ChevronRight,
} from "lucide-react";

type Tab = "profile" | "salon" | "permissions" | "password";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "내 정보", icon: User },
  { id: "salon", label: "매장 정보", icon: Building2 },
  { id: "permissions", label: "권한 정보", icon: ShieldCheck },
  { id: "password", label: "비밀번호 변경", icon: KeyRound },
];

const ROLE_LABEL: Record<string, string> = {
  owner: "원장",
  manager: "매니저",
  designer: "디자이너",
};

const ROLE_DESC: Record<string, string> = {
  owner: "매장의 모든 데이터에 접근하고 수정할 수 있습니다. 디자이너·메뉴 관리, 데이터 삭제, 설정 변경이 가능합니다.",
  manager: "예약·고객 관리, 디자이너·메뉴 수정이 가능합니다. 데이터 삭제 및 매장 설정 변경은 원장만 가능합니다.",
  designer: "본인 예약 조회 및 고객 기본정보 읽기만 가능합니다. 데이터 수정은 원장·매니저에게 문의하세요.",
};

const PLAN_LABEL: Record<string, string> = {
  free: "무료",
  starter: "스타터",
  pro: "프로",
};

export default function SettingsPage() {
  const { user, userData, loading, refreshUserData } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // ── 내 정보 ─────────────────────────────────────────────
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── 매장 정보 ────────────────────────────────────────────
  const [salon, setSalon] = useState<Salon | null>(null);
  const [salonForm, setSalonForm] = useState<SalonUpdate>({});
  const [salonLoading, setSalonLoading] = useState(false);
  const [salonSaving, setSalonSaving] = useState(false);
  const [salonMsg, setSalonMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── 비밀번호 ─────────────────────────────────────────────
  const [pwSending, setPwSending] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Init profile fields from userData
  useEffect(() => {
    if (userData) {
      setProfileName(userData.name ?? "");
      setProfilePhone(userData.phoneMasked ?? "");
    }
  }, [userData]);

  // Load salon info when switching to salon tab
  useEffect(() => {
    if (activeTab !== "salon" || !userData?.salonId) return;
    setSalonLoading(true);
    getSalon(userData.salonId).then((s) => {
      setSalon(s);
      if (s) {
        setSalonForm({
          name: s.name ?? "",
          phone: s.phone ?? "",
          address: s.address ?? "",
          businessHours: s.businessHours ?? "",
          description: s.description ?? "",
          naverPlaceUrl: s.naverPlaceUrl ?? "",
        });
      }
      setSalonLoading(false);
    });
  }, [activeTab, userData?.salonId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  // ── 내 정보 저장 ─────────────────────────────────────────
  async function handleProfileSave() {
    if (!user) return;
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateUserProfile(user.uid, {
        name: profileName.trim() || undefined,
        phoneMasked: profilePhone.trim() || undefined,
      });
      await refreshUserData();
      setProfileMsg({ ok: true, text: "내 정보가 저장되었습니다." });
    } catch {
      setProfileMsg({ ok: false, text: "저장에 실패했습니다. 다시 시도해주세요." });
    } finally {
      setProfileSaving(false);
    }
  }

  // ── 매장 정보 저장 ───────────────────────────────────────
  async function handleSalonSave() {
    const salonId = userData?.salonId;
    if (!salonId) return;
    setSalonSaving(true);
    setSalonMsg(null);
    try {
      await updateSalon(salonId, salonForm);
      setSalonMsg({ ok: true, text: "매장 정보가 저장되었습니다." });
    } catch {
      setSalonMsg({ ok: false, text: "저장에 실패했습니다. 다시 시도해주세요." });
    } finally {
      setSalonSaving(false);
    }
  }

  // ── 비밀번호 재설정 이메일 ─────────────────────────────────
  async function handlePasswordReset() {
    if (!user?.email) return;
    setPwSending(true);
    setPwMsg(null);
    try {
      await sendPasswordReset(user.email);
      setPwMsg({ ok: true, text: `${user.email}로 비밀번호 재설정 링크를 발송했습니다.` });
    } catch {
      setPwMsg({ ok: false, text: "이메일 발송에 실패했습니다. 다시 시도해주세요." });
    } finally {
      setPwSending(false);
    }
  }

  const canEditSalon = userData?.role === "owner";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">설정</h1>
          <p className="text-sm text-gray-500 mt-1">내 정보와 매장 정보를 관리합니다.</p>
        </div>

        <div className="flex gap-6">
          {/* Tab sidebar */}
          <div className="w-44 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id);
                    setProfileMsg(null);
                    setSalonMsg(null);
                    setPwMsg(null);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-white hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {label}
                  {activeTab !== id && (
                    <ChevronRight size={14} className="ml-auto text-gray-300" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

              {/* ── 내 정보 탭 ──────────────────────────────── */}
              {activeTab === "profile" && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-5">내 정보</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        이름
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="이름을 입력해주세요"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        이메일
                      </label>
                      <input
                        type="text"
                        value={user?.email ?? ""}
                        readOnly
                        className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-400 mt-1">이메일은 변경할 수 없습니다.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        연락처
                      </label>
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="010-0000-0000"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {profileMsg && (
                      <div
                        className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                          profileMsg.ok
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {profileMsg.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {profileMsg.text}
                      </div>
                    )}

                    <button
                      onClick={handleProfileSave}
                      disabled={profileSaving}
                      className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {profileSaving ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          저장 중...
                        </>
                      ) : (
                        "저장하기"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── 매장 정보 탭 ─────────────────────────────── */}
              {activeTab === "salon" && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold text-gray-900">매장 정보</h2>
                    {!canEditSalon && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                        원장만 수정 가능
                      </span>
                    )}
                  </div>

                  {salonLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={24} className="animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { label: "매장명", key: "name" as const, placeholder: "매장 이름" },
                        { label: "전화번호", key: "phone" as const, placeholder: "02-0000-0000" },
                        { label: "주소", key: "address" as const, placeholder: "서울시 강남구 테헤란로 123" },
                        { label: "운영 시간", key: "businessHours" as const, placeholder: "09:00~19:00" },
                        { label: "소개", key: "description" as const, placeholder: "매장 소개를 입력해주세요" },
                        { label: "네이버 플레이스 URL", key: "naverPlaceUrl" as const, placeholder: "https://naver.me/..." },
                      ].map(({ label, key, placeholder }) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            {label}
                          </label>
                          <input
                            type="text"
                            value={(salonForm[key] as string) ?? ""}
                            onChange={(e) =>
                              setSalonForm({ ...salonForm, [key]: e.target.value })
                            }
                            placeholder={placeholder}
                            readOnly={!canEditSalon}
                            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              canEditSalon
                                ? "border-gray-200"
                                : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                            }`}
                          />
                        </div>
                      ))}

                      {/* Plan info (read-only) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          요금제
                        </label>
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

                      {salonMsg && (
                        <div
                          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                            salonMsg.ok
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {salonMsg.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                          {salonMsg.text}
                        </div>
                      )}

                      {canEditSalon && (
                        <button
                          onClick={handleSalonSave}
                          disabled={salonSaving}
                          className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                          {salonSaving ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              저장 중...
                            </>
                          ) : (
                            "저장하기"
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── 권한 정보 탭 ─────────────────────────────── */}
              {activeTab === "permissions" && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-5">권한 정보</h2>

                  {/* Current role */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {(userData?.name ?? user?.email ?? "?")[0]}
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

                  {/* Permissions table */}
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
                        {[
                          ["매장 정보 수정", true, false, false],
                          ["디자이너 관리", true, true, false],
                          ["시술 메뉴 관리", true, true, false],
                          ["고객 기본정보", true, true, "읽기만"],
                          ["고객 민감정보", true, true, false],
                          ["예약 전체 관리", true, true, "본인만"],
                          ["메시지 관리", true, true, false],
                          ["접근 로그 조회", true, true, false],
                          ["데이터 삭제", true, false, false],
                        ].map(([feature, owner, manager, designer], i) => (
                          <tr
                            key={i}
                            className={`${
                              userData?.role === "owner" && owner === true
                                ? "bg-blue-50/30"
                                : userData?.role === "manager" && manager === true
                                ? "bg-blue-50/30"
                                : userData?.role === "designer" && designer !== false
                                ? "bg-blue-50/30"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-2.5 text-gray-700">{feature as string}</td>
                            <td className="px-2 py-2.5 text-center">
                              {owner === true ? (
                                <span className="text-green-500">✓</span>
                              ) : owner === false ? (
                                <span className="text-gray-300">–</span>
                              ) : (
                                <span className="text-amber-500 text-[10px]">{owner}</span>
                              )}
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              {manager === true ? (
                                <span className="text-green-500">✓</span>
                              ) : manager === false ? (
                                <span className="text-gray-300">–</span>
                              ) : (
                                <span className="text-amber-500 text-[10px]">{manager}</span>
                              )}
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              {designer === true ? (
                                <span className="text-green-500">✓</span>
                              ) : designer === false ? (
                                <span className="text-gray-300">–</span>
                              ) : (
                                <span className="text-amber-500 text-[10px]">{designer}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-gray-400 mt-4">
                    권한 변경은 원장님이 보안 및 권한 관리 페이지에서 직접 처리해야 합니다.
                  </p>
                </div>
              )}

              {/* ── 비밀번호 변경 탭 ─────────────────────────── */}
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

                  {pwMsg && (
                    <div
                      className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm mb-5 ${
                        pwMsg.ok
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {pwMsg.ok ? (
                        <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      )}
                      <span>{pwMsg.text}</span>
                    </div>
                  )}

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

                  <p className="text-xs text-gray-400 mt-3 text-center">
                    이메일이 오지 않으면 스팸함을 확인해주세요.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
