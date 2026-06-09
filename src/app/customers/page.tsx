"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { gradeColor, maskPhone } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  getCustomers,
  getCustomerPrivate,
  addCustomer,
  updateCustomer,
  saveCustomerPrivate,
  logCustomerAccess,
} from "@/services/customers";
import { getDesigners } from "@/services/designers";
import type { Customer, CustomerPrivate, CustomerGrade, Designer, PermissionRole, UserRole } from "@/types";
import type { UserData } from "@/context/AuthContext";
import {
  Search, Plus, MessageSquare, Calendar, X, Edit2,
  Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Phone, User, ChevronLeft,
} from "lucide-react";

// ─── 상수 ────────────────────────────────────────────────────────────────────
const ROLE_MAP: Record<UserRole, PermissionRole> = {
  owner: "원장",
  manager: "매니저",
  designer: "디자이너",
};

const GRADES: CustomerGrade[] = ["신규", "재방문", "VIP", "휴면"];

// 연락처 자동 하이픈 포맷
function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

// ─── 고객 등록/수정 모달 ─────────────────────────────────────────────────────
interface FormState {
  name: string;
  phone: string;
  grade: CustomerGrade;
  preferredDesignerId: string;
  hairType: string;
  specialNote: string;
  tagsInput: string;
  nextVisitDate: string;
}

const DEFAULT_FORM: FormState = {
  name: "",
  phone: "",
  grade: "신규",
  preferredDesignerId: "",
  hairType: "",
  specialNote: "",
  tagsInput: "",
  nextVisitDate: "",
};

function CustomerFormModal({
  salonId,
  userData,
  customer,
  allCustomers,
  designers,
  onClose,
  onSaved,
}: {
  salonId: string;
  userData: UserData | null;
  customer?: Customer;
  allCustomers: Customer[];
  designers: Designer[];
  onClose: () => void;
  onSaved: (c: Customer) => void;
}) {
  const isOwnerOrManager =
    userData?.role === "owner" || userData?.role === "manager";
  const isEdit = !!customer;

  const [form, setForm] = useState<FormState>(() =>
    customer
      ? {
          name: customer.name,
          phone: customer.phoneMasked, // 편집 시 raw 폰으로 교체됨
          grade: customer.grade,
          preferredDesignerId: customer.preferredDesignerId ?? "",
          hairType: customer.hairType ?? "",
          specialNote: customer.specialNote ?? "",
          tagsInput: customer.tags.join(", "),
          nextVisitDate: customer.nextVisitDate ?? "",
        }
      : { ...DEFAULT_FORM }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [phoneReadOnly, setPhoneReadOnly] = useState(isEdit && !isOwnerOrManager);

  // 수정 모드 + owner/manager → raw 폰 자동 조회
  useEffect(() => {
    if (!isEdit || !customer || !isOwnerOrManager) return;
    getCustomerPrivate(salonId, customer.id).then((priv) => {
      if (priv?.phoneRaw) {
        setForm((f) => ({ ...f, phone: priv.phoneRaw }));
      }
    });
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "고객명을 입력해주세요.";

    if (!phoneReadOnly) {
      if (!form.phone.trim()) {
        errs.phone = "연락처를 입력해주세요.";
      } else if (!/^010-\d{4}-\d{4}$/.test(form.phone)) {
        errs.phone = "010-0000-0000 형식으로 입력해주세요.";
      } else {
        // 중복 체크
        const masked = maskPhone(form.phone);
        const dup = allCustomers.some(
          (c) => c.phoneMasked === masked && c.id !== customer?.id
        );
        if (dup) errs.phone = "이미 등록된 연락처입니다.";
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    setMsg(null);

    const masked = phoneReadOnly ? form.phone : maskPhone(form.phone);
    const selectedDesigner = designers.find((d) => d.id === form.preferredDesignerId);

    const customerData: Omit<Customer, "id"> = {
      name: form.name.trim(),
      phoneMasked: masked,
      grade: form.grade,
      preferredDesignerId: form.preferredDesignerId || undefined,
      preferredDesignerName: selectedDesigner?.name,
      hairType: form.hairType.trim() || undefined,
      specialNote: form.specialNote.trim() || undefined,
      tags: form.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      visitHistory: customer?.visitHistory ?? [],
      totalVisits: customer?.totalVisits ?? 0,
      totalSpent: customer?.totalSpent ?? 0,
      registeredAt: (() => {
          if (customer?.registeredAt) return customer.registeredAt;
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })(),
      lastVisitDate: customer?.lastVisitDate ?? "",
      nextVisitDate: form.nextVisitDate || undefined,
    };

    const privateData: CustomerPrivate = { phoneRaw: form.phone };

    try {
      let savedId: string;

      if (customer) {
        // 수정
        await updateCustomer(salonId, customer.id, customerData);
        if (isOwnerOrManager && !phoneReadOnly) {
          await saveCustomerPrivate(salonId, customer.id, privateData);
        }
        savedId = customer.id;
        if (userData) {
          logCustomerAccess(salonId, "customer_updated", savedId, {
            uid: userData.uid,
            name: userData.name,
            role: ROLE_MAP[userData.role],
          });
        }
      } else {
        // 신규 등록
        savedId = await addCustomer(
          salonId,
          customerData,
          isOwnerOrManager ? privateData : undefined
        );
        if (userData) {
          logCustomerAccess(salonId, "customer_created", savedId, {
            uid: userData.uid,
            name: userData.name,
            role: ROLE_MAP[userData.role],
          });
        }
      }

      onSaved({ ...customerData, id: savedId });
    } catch {
      setMsg({ ok: false, text: "저장에 실패했습니다. 다시 시도해주세요." });
      setSaving(false);
    }
  }

  const inputCls = (field: string) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
      errors[field]
        ? "border-red-400 bg-red-50"
        : "border-gray-200 bg-white"
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-lg text-gray-900">
            {isEdit ? "고객 정보 수정" : "신규 고객 등록"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex-1 overflow-y-auto space-y-4">
          {/* 기본 정보 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              기본 정보
            </p>
            <div className="space-y-3">
              {/* 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  고객명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="홍길동"
                  className={inputCls("name")}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.name}
                  </p>
                )}
              </div>

              {/* 연락처 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  연락처 <span className="text-red-500">*</span>
                  {!isOwnerOrManager && isEdit && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      (원장·매니저만 수정 가능)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => set("phone", formatPhone(e.target.value))}
                  placeholder="010-0000-0000"
                  readOnly={phoneReadOnly}
                  className={`${inputCls("phone")} ${phoneReadOnly ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.phone}
                  </p>
                )}
                {!isOwnerOrManager && !isEdit && (
                  <p className="text-xs text-amber-600 mt-1">
                    원본 연락처는 원장·매니저만 저장됩니다.
                  </p>
                )}
              </div>

              {/* 등급 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  고객 등급 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => set("grade", g)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        form.grade === g
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 추가 정보 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              추가 정보
            </p>
            <div className="space-y-3">
              {/* 선호 디자이너 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  선호 디자이너
                </label>
                <select
                  value={form.preferredDesignerId}
                  onChange={(e) => set("preferredDesignerId", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">선택 안함</option>
                  {designers
                    .filter((d) => d.status === "active")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.roleTitle})
                      </option>
                    ))}
                </select>
              </div>

              {/* 모발 타입 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  모발 타입
                </label>
                <input
                  type="text"
                  value={form.hairType}
                  onChange={(e) => set("hairType", e.target.value)}
                  placeholder="가늘고 손상된 모발"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 특이사항 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  특이사항
                </label>
                <textarea
                  rows={2}
                  value={form.specialNote}
                  onChange={(e) => set("specialNote", e.target.value)}
                  placeholder="두피가 민감하여 자극 없는 제품 사용 권장"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* 태그 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  태그{" "}
                  <span className="text-gray-400 font-normal text-xs">
                    (쉼표로 구분)
                  </span>
                </label>
                <input
                  type="text"
                  value={form.tagsInput}
                  onChange={(e) => set("tagsInput", e.target.value)}
                  placeholder="VIP, 염색 선호, 민감성 두피"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 다음 방문 예정 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  다음 방문 예정일
                </label>
                <input
                  type="date"
                  value={form.nextVisitDate}
                  onChange={(e) => set("nextVisitDate", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 결과 메시지 */}
          {msg && (
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm border ${
                msg.ok
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {msg.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              {msg.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" />저장 중...</>
            ) : isEdit ? (
              "수정 완료"
            ) : (
              "고객 등록"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 고객 상세 패널 ───────────────────────────────────────────────────────────
function CustomerDetail({
  c,
  salonId,
  userData,
  onEdit,
}: {
  c: Customer;
  salonId: string;
  userData: UserData | null;
  onEdit: (customer: Customer) => void;
}) {
  const isOwnerOrManager =
    userData?.role === "owner" || userData?.role === "manager";

  const [rawPhone, setRawPhone] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [loadingPhone, setLoadingPhone] = useState(false);

  // 고객이 바뀌면 raw 폰 초기화
  useEffect(() => {
    setRawPhone(null);
    setShowRaw(false);
  }, [c.id]);

  async function handleRevealPhone() {
    if (!isOwnerOrManager) return;
    if (rawPhone !== null) {
      setShowRaw((v) => !v);
      return;
    }
    setLoadingPhone(true);
    const priv = await getCustomerPrivate(salonId, c.id);
    setRawPhone(priv?.phoneRaw ?? "정보 없음");
    setShowRaw(true);
    if (userData) {
      logCustomerAccess(salonId, "customer_phone_viewed", c.id, {
        uid: userData.uid,
        name: userData.name,
        role: ROLE_MAP[userData.role],
      });
    }
    setLoadingPhone(false);
  }

  return (
    <div className="flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      {/* 프로필 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {c.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{c.name}</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${gradeColor(c.grade)}`}
              >
                {c.grade}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Phone size={13} />
              <span>{showRaw && rawPhone ? rawPhone : c.phoneMasked}</span>
              {isOwnerOrManager && (
                <button
                  onClick={handleRevealPhone}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 ml-1"
                  title={showRaw ? "가리기" : "원본 연락처 조회"}
                >
                  {loadingPhone ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : showRaw ? (
                    <EyeOff size={13} />
                  ) : (
                    <Eye size={13} />
                  )}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {c.tags.map((t) => (
                <span
                  key={t}
                  className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(c)}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            <Edit2 size={13} />
            수정
          </button>
          <button className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
            <MessageSquare size={13} />
            메시지
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 방문 이력 */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <Calendar size={14} className="text-blue-600" /> 방문 이력
          </h3>
          {c.visitHistory.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              방문 이력이 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {c.visitHistory.map((v, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    {i < c.visitHistory.length - 1 && (
                      <div className="w-0.5 bg-gray-200 flex-1 mt-1" />
                    )}
                  </div>
                  <div className="pb-3 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-gray-900">{v.date}</span>
                      <span className="text-xs text-blue-600 font-medium">
                        {v.price.toLocaleString()}원
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{v.serviceName}</p>
                    <p className="text-xs text-gray-500">{v.designerName}</p>
                    {v.memo && (
                      <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                        {v.memo}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽 정보 */}
        <div className="space-y-4">
          {/* 선호 정보 */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">선호 정보</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: "선호 디자이너", value: c.preferredDesignerName || "-" },
                { label: "모발 타입", value: c.hairType || "-" },
                { label: "특이사항", value: c.specialNote || "-" },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <span className="text-gray-400 text-xs w-24 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-gray-800 text-sm leading-snug">{value}</span>
                </div>
              ))}
              {c.nextVisitDate && (
                <div className="flex gap-3">
                  <span className="text-gray-400 text-xs w-24 flex-shrink-0 pt-0.5">
                    다음 방문
                  </span>
                  <span className="text-blue-600 font-medium text-sm">{c.nextVisitDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* 노쇼 정보 (있을 때만) */}
          {(c.noShowCount ?? 0) > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-700">
                노쇼 이력: {c.noShowCount}회
              </p>
              {c.lastNoShowDate && (
                <p className="text-xs text-red-500 mt-0.5">
                  최근: {c.lastNoShowDate}
                </p>
              )}
            </div>
          )}

          {/* 통계 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600 mb-1">총 방문</p>
              <p className="text-xl font-bold text-blue-900">{c.totalVisits}회</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-xs text-purple-600 mb-1">누적 결제</p>
              <p className="text-sm font-bold text-purple-900">
                {c.totalSpent.toLocaleString()}원
              </p>
            </div>
          </div>

          {/* 최근 시술 메모 */}
          {c.visitHistory.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">최근 시술 메모</h3>
              <div className="space-y-2">
                {c.visitHistory.slice(0, 3).map((v, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-xs">
                    <p className="text-gray-400 mb-1">
                      {v.date} ({v.designerName})
                    </p>
                    <p className="text-gray-700">{v.memo || "메모 없음"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const { userData } = useAuth();
  const salonId = userData?.salonId ?? "salon1";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [filter, setFilter] = useState<string>("전체");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [loadingList, setLoadingList] = useState(true);

  async function loadCustomers() {
    const list = await getCustomers(salonId);
    setCustomers(list);
    setLoadingList(false);
    return list;
  }

  useEffect(() => {
    loadCustomers().then((list) => {
      if (list.length > 0) setSelected(list[0]);
    });
    getDesigners(salonId).then(setDesigners);
  }, [salonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.name.includes(q) ||
      c.phoneMasked.includes(q) ||
      c.tags.some((t) => t.includes(q));
    const matchFilter = filter === "전체" || c.grade === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    전체: customers.length,
    VIP: customers.filter((c) => c.grade === "VIP").length,
    신규: customers.filter((c) => c.grade === "신규").length,
    재방문: customers.filter((c) => c.grade === "재방문").length,
  };

  function openCreate() {
    setEditingCustomer(undefined);
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setEditingCustomer(c);
    setShowForm(true);
  }

  async function handleSaved(savedCustomer: Customer) {
    setShowForm(false);
    setEditingCustomer(undefined);
    const list = await loadCustomers();
    const found = list.find((c) => c.id === savedCustomer.id);
    if (found) setSelected(found);
  }

  return (
    <AdminLayout title="고객 관리" description="고객 정보를 조회하고 관리하세요.">
      {/* 등록/수정 모달 */}
      {showForm && (
        <CustomerFormModal
          salonId={salonId}
          userData={userData}
          customer={editingCustomer}
          allCustomers={customers}
          designers={designers}
          onClose={() => { setShowForm(false); setEditingCustomer(undefined); }}
          onSaved={handleSaved}
        />
      )}

      <div className="flex gap-4 h-full flex-col lg:flex-row">
        {/* 목록 패널 */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-3">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              고객 목록{" "}
              <span className="text-xs text-gray-400 font-normal">
                {customers.length}명
              </span>
            </h2>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={12} />
              고객 등록
            </button>
          </div>

          {/* 검색 */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              placeholder="이름, 전화번호, 태그 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 필터 탭 */}
          <div className="flex gap-1 overflow-x-auto">
            {Object.entries(counts).map(([label, count]) => (
              <button
                key={label}
                onClick={() => setFilter(label)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === label
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label} {count}
              </button>
            ))}
          </div>

          {/* 목록 */}
          <div className="space-y-1">
            {loadingList ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-blue-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <User size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">
                  {search ? "검색 결과가 없습니다." : "등록된 고객이 없습니다."}
                </p>
                {!search && (
                  <button
                    onClick={openCreate}
                    className="mt-3 text-xs text-blue-600 hover:underline"
                  >
                    첫 고객 등록하기 →
                  </button>
                )}
              </div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`p-3 rounded-xl cursor-pointer border transition-all ${
                    selected?.id === c.id
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-transparent hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{c.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${gradeColor(c.grade)}`}
                        >
                          {c.grade}
                        </span>
                        {(c.noShowCount ?? 0) > 0 && (
                          <span className="text-[10px] text-red-500 font-medium">
                            노쇼{c.noShowCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{c.phoneMasked}</p>
                      <p className="text-xs text-gray-400">
                        최근 방문 {c.lastVisitDate || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── 상세 패널 ── */}
        {selected ? (
          <>
            {/* 모바일: 전체화면 오버레이 */}
            <div className="fixed inset-0 z-40 bg-white overflow-y-auto pb-24 lg:hidden">
              <div className="p-4">
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1.5 text-blue-600 text-sm font-medium mb-4 min-h-[44px]"
                >
                  <ChevronLeft size={16} />
                  고객 목록으로
                </button>
                <CustomerDetail
                  c={selected}
                  salonId={salonId}
                  userData={userData}
                  onEdit={openEdit}
                />
              </div>
            </div>
            {/* 데스크탑: 인라인 사이드패널 */}
            <div className="hidden lg:flex flex-1 min-w-0">
              <CustomerDetail
                c={selected}
                salonId={salonId}
                userData={userData}
                onEdit={openEdit}
              />
            </div>
          </>
        ) : (
          <div className="hidden lg:flex flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex-col items-center justify-center gap-3">
            <User size={32} className="text-gray-300" />
            <p className="text-sm text-gray-400">고객을 선택하거나 새로 등록하세요.</p>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} />
              첫 고객 등록
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
