"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import {
  getServices,
  addService,
  updateService,
  toggleServiceActive,
  logServiceAccess,
} from "@/services/services";
import { getDesigners } from "@/services/designers";
import type { ServiceMenu, Designer, PermissionRole } from "@/types";
import {
  Plus,
  Edit2,
  Search,
  Loader2,
  AlertCircle,
  ShieldOff,
  CheckCircle,
  X,
  ChevronDown,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES = ["전체", "컷", "펌", "염색", "클리닉", "두피케어", "스타일링", "기타"] as const;
type Category = (typeof CATEGORIES)[number];

const SERVICE_CATEGORIES = ["컷", "펌", "염색", "클리닉", "두피케어", "스타일링", "기타"] as const;
type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

const CAT_COLORS: Record<string, string> = {
  컷: "bg-blue-100 text-blue-700",
  펌: "bg-purple-100 text-purple-700",
  염색: "bg-pink-100 text-pink-700",
  클리닉: "bg-green-100 text-green-700",
  두피케어: "bg-teal-100 text-teal-700",
  스타일링: "bg-orange-100 text-orange-700",
  기타: "bg-gray-100 text-gray-600",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDuration(min: number): string {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm text-white"
      style={{ background: ok ? "#16a34a" : "#dc2626" }}
    >
      {ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

// ── ServiceFormModal ───────────────────────────────────────────────────────

interface ServiceFormModalProps {
  service: ServiceMenu | null;
  designers: Designer[];
  onClose: () => void;
  onSave: (s: Omit<ServiceMenu, "id">, id?: string) => Promise<void>;
}

interface FormErrors {
  name?: string;
  price?: string;
  duration?: string;
}

function ServiceFormModal({ service, designers, onClose, onSave }: ServiceFormModalProps) {
  const isEdit = service !== null;
  const [form, setForm] = useState<Omit<ServiceMenu, "id">>({
    category: (service?.category ?? "컷") as ServiceCategory,
    name: service?.name ?? "",
    price: service?.price ?? 0,
    duration: service?.duration ?? 60,
    description: service?.description ?? "",
    assignedDesignerIds: service?.assignedDesignerIds ?? [],
    naverMenuName: service?.naverMenuName ?? "",
    active: service?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [errs, setErrs] = useState<FormErrors>({});

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "시술명을 입력해주세요.";
    if (form.price < 0 || isNaN(form.price)) e.price = "가격은 0 이상의 숫자를 입력해주세요.";
    if (form.duration < 10 || isNaN(form.duration)) {
      e.duration = "소요시간은 10분 이상이어야 합니다.";
    } else if (form.duration % 10 !== 0) {
      e.duration = "소요시간은 10분 단위로 입력해주세요. (예: 30, 60, 90)";
    }
    return e;
  }

  async function handleSubmit() {
    const validErrs = validate();
    if (Object.keys(validErrs).length > 0) {
      setErrs(validErrs);
      return;
    }
    setSaving(true);
    try {
      await onSave(form, service?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const activeDesigners = designers.filter((d) => d.status !== "inactive");

  const inputBase = "w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-lg text-gray-900">
            {isEdit ? "메뉴 수정" : "새 메뉴 등록"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* category + name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as ServiceCategory })
                }
                className={`${inputBase} border-gray-200`}
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                시술명 <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setErrs((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="여성 컷"
                className={`${inputBase} ${errs.name ? "border-red-400 bg-red-50" : "border-gray-200"}`}
              />
              {errs.name && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} />{errs.name}
                </p>
              )}
            </div>
          </div>

          {/* price + duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                가격 (원) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => {
                  setForm({ ...form, price: Number(e.target.value) });
                  setErrs((prev) => ({ ...prev, price: undefined }));
                }}
                className={`${inputBase} ${errs.price ? "border-red-400 bg-red-50" : "border-gray-200"}`}
              />
              {errs.price && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} />{errs.price}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                소요시간 (분) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={10}
                step={10}
                value={form.duration}
                onChange={(e) => {
                  setForm({ ...form, duration: Number(e.target.value) });
                  setErrs((prev) => ({ ...prev, duration: undefined }));
                }}
                className={`${inputBase} ${errs.duration ? "border-red-400 bg-red-50" : "border-gray-200"}`}
              />
              {errs.duration ? (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} />{errs.duration}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">{fmtDuration(form.duration)}</p>
              )}
            </div>
          </div>

          {/* description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">설명 (선택)</label>
            <textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="시술에 대한 간단한 설명"
              className={`${inputBase} border-gray-200 resize-none`}
            />
          </div>

          {/* assigned designers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">담당 디자이너</label>
            {activeDesigners.length === 0 ? (
              <p className="text-xs text-gray-400">등록된 디자이너가 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeDesigners.map((d) => {
                  const checked = form.assignedDesignerIds.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer text-sm transition-colors ${
                        checked
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...form.assignedDesignerIds, d.id]
                            : form.assignedDesignerIds.filter((id) => id !== d.id);
                          setForm({ ...form, assignedDesignerIds: ids });
                        }}
                        className="sr-only"
                      />
                      {d.name}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* naver menu name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              네이버 메뉴명
              <span className="ml-1.5 text-xs font-normal text-gray-400">(연동 준비)</span>
            </label>
            <input
              value={form.naverMenuName ?? ""}
              onChange={(e) => setForm({ ...form, naverMenuName: e.target.value })}
              placeholder="네이버예약에 표시될 메뉴명"
              className={`${inputBase} border-gray-200`}
            />
          </div>

          {/* active toggle (edit only) */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">사용 여부</p>
                <p className="text-xs text-gray-400">비활성화 시 예약에서 숨겨집니다</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, active: !form.active })}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                  form.active ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    form.active ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" />저장 중...</> : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DeactivateConfirmModal ─────────────────────────────────────────────────

function DeactivateConfirmModal({
  service,
  onConfirm,
  onClose,
}: {
  service: ServiceMenu;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-red-600" />
        </div>
        <h3 className="font-bold text-gray-900 text-center mb-2">메뉴 비활성화</h3>
        <p className="text-sm text-gray-600 text-center mb-1">
          <span className="font-semibold">{service.name}</span>을(를) 비활성화하시겠어요?
        </p>
        <p className="text-xs text-gray-400 text-center mb-6">
          비활성화된 메뉴는 예약에서 숨겨지며, 언제든 재활성화할 수 있습니다.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={async () => {
              setLoading(true);
              await onConfirm();
              setLoading(false);
              onClose();
            }}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "처리 중..." : "비활성화"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ActiveBadge ────────────────────────────────────────────────────────────

function ActiveBadge({
  service,
  canManage,
  onToggle,
}: {
  service: ServiceMenu;
  canManage: boolean;
  onToggle: (active: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!canManage) {
    return (
      <span
        className={`text-xs font-medium px-2 py-1 rounded-full ${
          service.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}
      >
        {service.active ? "사용 중" : "비활성"}
      </span>
    );
  }
  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
          service.active
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
      >
        {service.active ? "사용 중" : "비활성"}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-28 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {service.active ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(false);
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-xs text-left text-gray-700 hover:bg-gray-50"
            >
              비활성화
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(true);
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-xs text-left text-green-700 hover:bg-green-50"
            >
              재활성화
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const { user: authUser, userData, loading: authLoading } = useAuth();

  // salonId: 기본값 "salon1" 제거 — null이면 guard에서 차단
  const salonId = userData?.salonId ?? null;
  const userRole = userData?.role ?? null;

  const canManageServices = userRole === "owner" || userRole === "manager";

  const [services, setServices] = useState<ServiceMenu[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [category, setCategory] = useState<Category>("전체");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [selectedService, setSelectedService] = useState<ServiceMenu | null>(null);
  const [modalService, setModalService] = useState<ServiceMenu | null | undefined>(undefined);
  const [deactivateTarget, setDeactivateTarget] = useState<ServiceMenu | null>(null);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // acting user for logs
  const actingRole: PermissionRole =
    userRole === "owner" ? "원장" : userRole === "manager" ? "매니저" : "디자이너";
  const actingUser = {
    uid: authUser?.uid ?? "",
    name: userData?.name ?? authUser?.email ?? "",
    role: actingRole,
  };

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
  }

  const loadData = useCallback(async () => {
    // salonId 없으면 조회하지 않음
    if (!salonId) return;

    setDataLoading(true);
    setDataError(null);
    try {
      const svcs = await getServices(salonId);
      setServices(svcs);
    } catch (err) {
      console.error(err);
      setDataError("시술 메뉴 데이터를 불러오지 못했습니다.");
    } finally {
      setDataLoading(false);
    }
    // designers: optional — don't block
    getDesigners(salonId)
      .then(setDesigners)
      .catch(() => {});
  }, [salonId]);

  useEffect(() => {
    if (!authLoading && authUser) {
      if (salonId) {
        loadData();
      } else {
        // userData가 로드됐지만 salonId 없음 → 로딩 해제
        setDataLoading(false);
      }
    }
  }, [authLoading, authUser, salonId, loadData]);

  // ── Guards ────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <AdminLayout title="시술 메뉴 관리" description="시술 메뉴, 가격, 소요시간을 관리하세요.">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <span className="ml-3 text-gray-500 text-sm">권한 확인 중...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!authUser) return null;

  if (!userData) {
    return (
      <AdminLayout title="시술 메뉴 관리" description="">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle size={36} className="text-orange-500" />
          <p className="font-medium text-gray-700">사용자 정보를 불러올 수 없습니다.</p>
          <p className="text-sm text-gray-500">
            <a href="/setup" className="text-blue-600 underline">초기 설정</a>을 먼저 진행해주세요.
          </p>
        </div>
      </AdminLayout>
    );
  }

  // salonId 없으면 임의 저장 방지 — 명확한 에러 표시
  if (!salonId) {
    return (
      <AdminLayout title="시술 메뉴 관리" description="">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle size={36} className="text-red-500" />
          <p className="font-medium text-gray-700">매장 정보가 연결되지 않았습니다.</p>
          <p className="text-sm text-gray-400">
            users/{authUser.uid}.salonId를 확인해주세요.
          </p>
        </div>
      </AdminLayout>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSave(data: Omit<ServiceMenu, "id">, id?: string) {
    if (!salonId) return;
    try {
      if (id) {
        await updateService(salonId, id, data, actingUser.uid);
        setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
        setSelectedService((prev) => (prev?.id === id ? { ...prev, ...data } : prev));
        logServiceAccess(salonId, "service_updated", id, actingUser);
        showToast("메뉴가 수정되었습니다.");
      } else {
        const newId = await addService(salonId, data, actingUser.uid);
        const newS: ServiceMenu = { ...data, id: newId };
        setServices((prev) => [...prev, newS]);
        logServiceAccess(salonId, "service_created", newId, actingUser);
        showToast("새 메뉴가 등록되었습니다.");
      }
    } catch (err) {
      console.error(err);
      showToast("저장에 실패했습니다. 다시 시도해주세요.", false);
    }
  }

  async function handleToggleActive(service: ServiceMenu, active: boolean) {
    if (!salonId) return;
    try {
      await toggleServiceActive(salonId, service.id, active, actingUser.uid);
      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, active } : s)));
      if (selectedService?.id === service.id)
        setSelectedService((prev) => (prev ? { ...prev, active } : prev));
      logServiceAccess(
        salonId,
        active ? "service_reactivated" : "service_deactivated",
        service.id,
        actingUser
      );
      showToast(active ? "메뉴가 재활성화되었습니다." : "메뉴가 비활성화되었습니다.", active);
    } catch (err) {
      console.error(err);
      showToast("상태 변경에 실패했습니다.", false);
    }
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = services.filter((s) => {
    const matchCat = category === "전체" || s.category === category;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.active) ||
      (statusFilter === "inactive" && !s.active);
    const q = search.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q) ||
      (s.naverMenuName ?? "").toLowerCase().includes(q);
    return matchCat && matchStatus && matchSearch;
  });

  const activeCount = services.filter((s) => s.active).length;
  const inactiveCount = services.filter((s) => !s.active).length;
  const isFiltered = search !== "" || category !== "전체" || statusFilter !== "all";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout title="시술 메뉴 관리" description="시술 메뉴, 가격, 소요시간을 관리하세요.">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}

      {modalService !== undefined && (
        <ServiceFormModal
          service={modalService}
          designers={designers}
          onClose={() => setModalService(undefined)}
          onSave={handleSave}
        />
      )}

      {deactivateTarget && (
        <DeactivateConfirmModal
          service={deactivateTarget}
          onConfirm={() => handleToggleActive(deactivateTarget, false)}
          onClose={() => setDeactivateTarget(null)}
        />
      )}

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* ── Left: list ── */}
        <div className="flex-1 space-y-4">
          {/* Controls */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Category tabs */}
              <div className="flex gap-1 overflow-x-auto pb-0.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      category === c
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Status filter */}
              <div className="flex gap-1">
                {(
                  [
                    { v: "all", label: "전체" },
                    { v: "active", label: `사용 중 ${activeCount}` },
                    { v: "inactive", label: `비활성 ${inactiveCount}` },
                  ] as const
                ).map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setStatusFilter(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === v
                        ? "bg-gray-800 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 min-w-32">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="메뉴명, 설명, 네이버 메뉴명 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {canManageServices && (
                <button
                  onClick={() => setModalService(null)}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                >
                  <Plus size={16} />
                  새 메뉴 등록
                </button>
              )}
            </div>
          </div>

          {/* Loading / Error / Empty / Table */}
          {dataLoading ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-500">불러오는 중...</span>
            </div>
          ) : dataError ? (
            <div className="bg-white rounded-xl border border-red-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-sm text-red-600">{dataError}</p>
              <button
                onClick={loadData}
                className="text-sm text-blue-600 underline hover:text-blue-700"
              >
                다시 시도
              </button>
            </div>
          ) : services.length === 0 ? (
            /* 진짜 빈 상태 (데이터 0개) */
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <Search size={24} className="text-gray-400" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-700">등록된 시술 메뉴가 없습니다.</p>
                <p className="text-sm text-gray-400 mt-1">첫 번째 시술 메뉴를 등록해보세요.</p>
              </div>
              {canManageServices && (
                <button
                  onClick={() => setModalService(null)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} />
                  새 메뉴 등록
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["카테고리", "메뉴명", "가격", "소요시간", "담당 디자이너", "네이버 매칭", "상태", ""].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                        {isFiltered
                          ? "검색 결과가 없습니다."
                          : "등록된 시술 메뉴가 없습니다."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() =>
                          setSelectedService(s.id === selectedService?.id ? null : s)
                        }
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedService?.id === s.id ? "bg-blue-50" : ""
                        } ${!s.active ? "opacity-60" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              CAT_COLORS[s.category] ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {s.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{s.name}</p>
                          {s.description && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">
                              {s.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{s.price.toLocaleString()}원</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDuration(s.duration)}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {/* assignedDesignerIds 기준으로 designers에서 역참조 */}
                          {designers
                            .filter((d) => s.assignedDesignerIds.includes(d.id))
                            .map((d) => d.name)
                            .join(", ") || "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {s.naverMenuName || "-"}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <ActiveBadge
                            service={s}
                            canManage={canManageServices}
                            onToggle={(active) => {
                              if (!active) setDeactivateTarget(s);
                              else handleToggleActive(s, true);
                            }}
                          />
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {canManageServices && (
                            <button
                              onClick={() => setModalService(s)}
                              className="text-gray-400 hover:text-gray-700 p-1"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-gray-50">
                <p className="text-xs text-gray-400">
                  전체 {services.length}개 · 사용 중 {activeCount}개 · 비활성 {inactiveCount}개
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: detail panel ── */}
        {selectedService && (
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 truncate">{selectedService.name}</h3>
                <div className="flex items-center gap-2">
                  {canManageServices && (
                    <button
                      onClick={() => setModalService(selectedService)}
                      className="text-blue-600 text-xs hover:underline"
                    >
                      수정
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedService(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3 py-1.5 border-b border-gray-50">
                  <span className="text-gray-500 text-xs w-24">카테고리</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      CAT_COLORS[selectedService.category] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedService.category}
                  </span>
                </div>
                {[
                  { label: "가격", value: `${selectedService.price.toLocaleString()}원` },
                  { label: "소요시간", value: fmtDuration(selectedService.duration) },
                  { label: "사용 여부", value: selectedService.active ? "사용 중" : "비활성화" },
                  { label: "네이버 메뉴명", value: selectedService.naverMenuName || "-" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-gray-500 text-xs w-24">{label}</span>
                    <span className="font-medium text-gray-900 text-xs">{value}</span>
                  </div>
                ))}

                {selectedService.description && (
                  <div className="py-1.5 border-b border-gray-50">
                    <p className="text-gray-500 text-xs mb-1">설명</p>
                    <p className="text-xs text-gray-700">{selectedService.description}</p>
                  </div>
                )}

                <div className="py-1.5">
                  <p className="text-gray-500 text-xs mb-2">담당 디자이너</p>
                  <div className="flex flex-wrap gap-1">
                    {/* assignedDesignerIds 기준으로 이름 역참조 */}
                    {designers
                      .filter((d) => selectedService.assignedDesignerIds.includes(d.id))
                      .map((d) => (
                        <span
                          key={d.id}
                          className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                        >
                          {d.name}
                        </span>
                      ))}
                    {designers.filter((d) =>
                      selectedService.assignedDesignerIds.includes(d.id)
                    ).length === 0 && (
                      <span className="text-xs text-gray-400">담당 디자이너 없음</span>
                    )}
                  </div>
                </div>
              </div>

              {canManageServices && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {selectedService.active ? (
                    <button
                      onClick={() => setDeactivateTarget(selectedService)}
                      className="w-full text-xs text-red-600 border border-red-200 rounded-xl py-2 hover:bg-red-50 transition-colors"
                    >
                      비활성화
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleActive(selectedService, true)}
                      className="w-full text-xs text-green-600 border border-green-200 rounded-xl py-2 hover:bg-green-50 transition-colors"
                    >
                      재활성화
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
