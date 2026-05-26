"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import {
  getDesigners,
  addDesigner,
  updateDesigner,
  updateDesignerStatus,
  deactivateDesigner,
  logDesignerAccess,
} from "@/services/designers";
import { getServices } from "@/services/services";
import { getReservations } from "@/services/reservations";
import type { Designer, ServiceMenu, Reservation, PermissionRole, UserRole } from "@/types";
import {
  Plus,
  Edit2,
  Clock,
  CalendarOff,
  Loader2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  X,
  ChevronDown,
  ShieldOff,
} from "lucide-react";

// ── 상수 ────────────────────────────────────────────────────────────────────

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const TIME_SLOTS = [
  "09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00","17:30",
  "18:00","18:30","19:00","19:30","20:00","20:30",
];
const PRESET_COLORS = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b",
  "#ef4444","#ec4899","#06b6d4","#64748b",
];
const DEMO_DATE = "2025-05-25";

// role → PermissionRole 매핑
const ROLE_MAP: Record<UserRole, PermissionRole> = {
  owner: "원장",
  manager: "매니저",
  designer: "디자이너",
};

// role 표시 레이블
const ROLE_LABEL: Record<UserRole, string> = {
  owner: "원장",
  manager: "매니저",
  designer: "디자이너",
};

// ── 상태 배지 ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Designer["status"] }) {
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />근무 중
      </span>
    );
  if (status === "off")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />휴무
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />비활성
    </span>
  );
}

// ── 전화번호 자동 하이픈 ─────────────────────────────────────────────────────

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// ── 디자이너 폼 초기값 ───────────────────────────────────────────────────────

function defaultForm(): Omit<Designer, "id"> {
  return {
    name: "",
    roleTitle: "디자이너",
    phoneMasked: "",
    status: "active",
    profileInitial: "",
    color: "#3b82f6",
    services: [],
    serviceIds: [],
    workDays: [1, 2, 3, 4, 5],
    startTime: "10:00",
    endTime: "19:00",
    daysOff: [],
    memo: "",
    joinedAt: new Date().toISOString().split("T")[0],
  };
}

// ── 디자이너 등록/수정 모달 ───────────────────────────────────────────────────

interface DesignerFormModalProps {
  designer: Designer | null;
  salonId: string;
  services: ServiceMenu[];
  onClose: () => void;
  onSaved: (id: string) => void;
  user: { uid: string; name: string; role: UserRole };
}

function DesignerFormModal({
  designer,
  salonId,
  services,
  onClose,
  onSaved,
  user,
}: DesignerFormModalProps) {
  const [form, setForm] = useState<Omit<Designer, "id">>(
    designer
      ? {
          name: designer.name,
          roleTitle: designer.roleTitle,
          phoneMasked: designer.phoneMasked ?? "",
          status: designer.status,
          profileInitial: designer.profileInitial,
          color: designer.color,
          services: designer.services,
          serviceIds: designer.serviceIds ?? [],
          workDays: designer.workDays,
          startTime: designer.startTime,
          endTime: designer.endTime,
          daysOff: designer.daysOff,
          memo: designer.memo ?? "",
          joinedAt: designer.joinedAt ?? new Date().toISOString().split("T")[0],
        }
      : defaultForm()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dayOffInput, setDayOffInput] = useState("");

  function handleNameChange(val: string) {
    setForm((f) => ({ ...f, name: val, profileInitial: val.trim()[0] ?? "" }));
  }

  function toggleService(svc: ServiceMenu) {
    const hasId = form.serviceIds?.includes(svc.id);
    const newIds = hasId
      ? (form.serviceIds ?? []).filter((id) => id !== svc.id)
      : [...(form.serviceIds ?? []), svc.id];
    const newNames = services.filter((s) => newIds.includes(s.id)).map((s) => s.name);
    setForm((f) => ({ ...f, serviceIds: newIds, services: newNames }));
  }

  function toggleWorkDay(dayIndex: number) {
    const days = form.workDays.includes(dayIndex)
      ? form.workDays.filter((d) => d !== dayIndex)
      : [...form.workDays, dayIndex].sort((a, b) => a - b);
    setForm((f) => ({ ...f, workDays: days }));
  }

  function addDayOff() {
    if (!dayOffInput || form.daysOff.includes(dayOffInput)) {
      setDayOffInput("");
      return;
    }
    setForm((f) => ({ ...f, daysOff: [...f.daysOff, dayOffInput].sort() }));
    setDayOffInput("");
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "이름을 입력해주세요.";
    if (!form.roleTitle.trim()) e.roleTitle = "직책을 입력해주세요.";
    if (!form.status) e.status = "근무상태를 선택해주세요.";
    if (!form.startTime) e.startTime = "출근 시간을 선택해주세요.";
    if (!form.endTime) e.endTime = "퇴근 시간을 선택해주세요.";
    if (form.startTime >= form.endTime)
      e.endTime = "퇴근 시간은 출근 시간 이후여야 합니다.";
    return e;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const role = ROLE_MAP[user.role];
      if (designer) {
        await updateDesigner(salonId, designer.id, form, { uid: user.uid });
        logDesignerAccess(salonId, "designer_updated", designer.id, {
          uid: user.uid,
          name: user.name,
          role,
        });
        onSaved(designer.id);
      } else {
        const newId = await addDesigner(salonId, form, { uid: user.uid, name: user.name });
        logDesignerAccess(salonId, "designer_created", newId, {
          uid: user.uid,
          name: user.name,
          role,
        });
        onSaved(newId);
      }
    } catch (err) {
      console.error("디자이너 저장 오류:", err);
      setErrors({ _: "저장 중 오류가 발생했습니다. 다시 시도해주세요." });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (field: string) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-900">
            {designer ? "디자이너 수정" : "디자이너 추가"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {errors._ && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle size={14} />
              {errors._}
            </div>
          )}

          {/* 이름 + 직책 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="홍길동"
                className={inputCls("name")}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                직책 <span className="text-red-500">*</span>
              </label>
              <input
                value={form.roleTitle}
                onChange={(e) => setForm((f) => ({ ...f, roleTitle: e.target.value }))}
                placeholder="디자이너"
                className={inputCls("roleTitle")}
              />
              {errors.roleTitle && <p className="text-xs text-red-500 mt-1">{errors.roleTitle}</p>}
            </div>
          </div>

          {/* 연락처 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              연락처
              <span className="ml-1 text-xs font-normal text-gray-400">(마스킹 저장)</span>
            </label>
            <input
              value={form.phoneMasked ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phoneMasked: formatPhone(e.target.value) }))}
              placeholder="010-1234-5678"
              maxLength={13}
              className={inputCls("phoneMasked")}
            />
          </div>

          {/* 근무상태 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              근무상태 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {(["active", "off", "inactive"] as const).map((s) => {
                const labels = { active: "근무 중", off: "휴무", inactive: "비활성" };
                const activeColors = {
                  active: "bg-green-600 text-white border-green-600",
                  off: "bg-yellow-500 text-white border-yellow-500",
                  inactive: "bg-gray-400 text-white border-gray-400",
                };
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.status === s ? activeColors[s] : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 색상 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">표시 색상</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    form.color === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : ""
                  }`}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="w-8 h-8 rounded-full cursor-pointer border border-gray-200"
                title="직접 선택"
              />
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ background: form.color }}
              >
                {form.name[0] ?? "?"}
              </div>
            </div>
          </div>

          {/* 근무 요일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">근무 요일</label>
            <div className="flex gap-2">
              {WEEK_LABELS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleWorkDay(i)}
                  className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                    form.workDays.includes(i)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 근무 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                출근 시간 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className={inputCls("startTime")}
              >
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                퇴근 시간 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className={inputCls("endTime")}
              >
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>}
            </div>
          </div>

          {/* 담당 시술 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">담당 가능 시술</label>
            {services.length === 0 ? (
              <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg px-4 py-3 text-center">
                등록된 시술 메뉴가 없습니다. 먼저 시술 메뉴를 등록해주세요.
              </p>
            ) : (
              <div className="border border-gray-200 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {services.filter((s) => s.active).map((svc) => (
                  <label
                    key={svc.id}
                    className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={form.serviceIds?.includes(svc.id) ?? false}
                      onChange={() => toggleService(svc)}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">{svc.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{svc.category}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 휴무일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">특정 휴무일</label>
            <div className="flex gap-2 mb-2">
              <input
                type="date"
                value={dayOffInput}
                onChange={(e) => setDayOffInput(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addDayOff}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                추가
              </button>
            </div>
            {form.daysOff.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.daysOff.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded-full border border-orange-200"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, daysOff: f.daysOff.filter((x) => x !== d) }))}
                      className="hover:text-orange-900"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">메모 (내부용)</label>
            <textarea
              value={form.memo ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
              rows={2}
              placeholder="내부 메모를 입력하세요."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 입사일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">입사일</label>
            <input
              type="date"
              value={form.joinedAt ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, joinedAt: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
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

// ── 비활성화 확인 모달 ──────────────────────────────────────────────────────

function DeactivateConfirmModal({
  designer,
  onConfirm,
  onClose,
  loading,
}: {
  designer: Designer;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">디자이너 비활성화</h3>
            <p className="text-xs text-gray-500">{designer.name} · {designer.roleTitle}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-1.5 leading-relaxed">
          디자이너를 비활성화하시겠습니까?
        </p>
        <p className="text-xs text-gray-400 mb-6">기존 예약 기록은 유지됩니다.</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            비활성화
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 상태 빠른 변경 드롭다운 ─────────────────────────────────────────────────

function StatusDropdown({
  designer,
  salonId,
  user,
  canEdit,
  onChange,
}: {
  designer: Designer;
  salonId: string;
  user: { uid: string; name: string; role: UserRole };
  canEdit: boolean;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);

  async function handleChange(status: Designer["status"]) {
    if (!canEdit) return;
    setOpen(false);
    setChanging(true);
    try {
      await updateDesignerStatus(salonId, designer.id, status, { uid: user.uid });
      logDesignerAccess(salonId, "designer_status_changed", designer.id, {
        uid: user.uid,
        name: user.name,
        role: ROLE_MAP[user.role],
      });
      onChange();
    } finally {
      setChanging(false);
    }
  }

  if (!canEdit) return <StatusBadge status={designer.status} />;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={changing}
        className="flex items-center gap-1 focus:outline-none"
      >
        {changing
          ? <Loader2 size={12} className="animate-spin text-gray-400" />
          : <StatusBadge status={designer.status} />
        }
        <ChevronDown size={12} className="text-gray-400 ml-0.5" />
      </button>
      {open && (
        <>
          {/* 오버레이 닫기 */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[110px]">
            {(["active", "off", "inactive"] as const).map((s) => {
              const labels = { active: "근무 중", off: "휴무", inactive: "비활성" };
              return (
                <button
                  key={s}
                  onClick={() => handleChange(s)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                    designer.status === s ? "font-semibold text-blue-600" : "text-gray-700"
                  }`}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function DesignersPage() {
  // authUser = Firebase Auth 객체 (로그인 여부 판단용)
  // userData = Firestore users/{uid} 문서 (역할·salonId 포함)
  const { user: authUser, userData, loading: authLoading } = useAuth();

  // ── 권한 판정 (auth 로딩 완료 후) ──────────────────────────────────────────
  const userRole = userData?.role as UserRole | undefined;
  const salonId = userData?.salonId ?? "";
  const userId = userData?.uid ?? authUser?.uid ?? "";
  const userName = userData?.name ?? authUser?.email?.split("@")[0] ?? "";

  // 권한 함수 통일
  const canManageDesigners = userRole === "owner" || userRole === "manager";
  const canDeactivateDesigner = userRole === "owner";
  const canReadDesigners =
    userRole === "owner" || userRole === "manager" || userRole === "designer";

  // accessLog / save 용 user 객체 (Auth와 충돌 방지: actingUser)
  const actingUser = {
    uid: userId,
    name: userName,
    role: (userRole ?? "designer") as UserRole,
  };

  // ── 데이터 상태 ───────────────────────────────────────────────────────────
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [services, setServices] = useState<ServiceMenu[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // 모달 상태
  const [modalDesigner, setModalDesigner] = useState<Designer | null | undefined>(undefined);
  const [deactivateTarget, setDeactivateTarget] = useState<Designer | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  function showToast(text: string, ok = true) {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 2500);
  }

  // ── 데이터 로드 ──────────────────────────────────────────────────────────
  // 디자이너는 독립 로드: 서비스/예약 실패가 디자이너 목록을 막지 않음
  async function loadData() {
    if (!salonId) return;
    setDataLoading(true);
    setDataError(null);
    try {
      // 디자이너 먼저 (필수) — 실패 시 에러 표시
      const d = await getDesigners(salonId);
      setDesigners(d);
    } catch (err) {
      console.error("디자이너 로드 오류:", err);
      setDataError(
        err instanceof Error ? err.message : "데이터를 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setDataLoading(false);
    }

    // 서비스/예약은 보조 데이터: 실패해도 화면은 표시
    Promise.allSettled([
      getServices(salonId),
      getReservations(salonId, DEMO_DATE),
    ]).then(([sRes, rRes]) => {
      if (sRes.status === "fulfilled") setServices(sRes.value);
      if (rRes.status === "fulfilled") setReservations(rRes.value);
    });
  }

  async function loadDesigners() {
    if (!salonId) return;
    try {
      const d = await getDesigners(salonId);
      setDesigners(d);
    } catch (err) {
      console.error("디자이너 목록 갱신 오류:", err);
    }
  }

  // auth 로딩 완료 후 salonId가 확정되면 데이터 로드
  useEffect(() => {
    if (authLoading) return;        // auth 아직 로딩 중이면 대기
    if (!salonId) return;           // salonId 없으면 대기
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, salonId]);

  async function handleSaved(id: string) {
    setModalDesigner(undefined);
    await loadDesigners();
    showToast("저장되었습니다.");
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deactivateDesigner(salonId, deactivateTarget.id, { uid: userId });
      logDesignerAccess(salonId, "designer_deactivated", deactivateTarget.id, {
        uid: userId,
        name: userName,
        role: ROLE_MAP[actingUser.role],
      });
      await loadDesigners();
      showToast("비활성화 처리되었습니다.");
    } finally {
      setDeactivating(false);
      setDeactivateTarget(null);
    }
  }

  const visibleDesigners = [
    ...designers.filter((d) => d.status !== "inactive"),
    ...designers.filter((d) => d.status === "inactive"),
  ];

  // ── 1단계: auth 로딩 중 ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <AdminLayout title="디자이너 관리" description="">
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
          <Loader2 size={28} className="animate-spin text-blue-500" />
          <p className="text-sm">권한 확인 중...</p>
        </div>
      </AdminLayout>
    );
  }

  // ── 2단계: Firebase Auth 로그인 안 됨 (AdminLayout이 이미 처리하지만 방어용) ──
  if (!authUser) {
    return null; // AdminLayout → /login redirect 처리
  }

  // ── 3단계: Firestore users/{uid} 문서 없음 → 초기 세팅 필요 ────────────────
  if (!userData) {
    return (
      <AdminLayout title="디자이너 관리" description="">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertCircle size={36} className="text-orange-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800 mb-1">
              사용자 정보를 불러올 수 없습니다.
            </p>
            <p className="text-xs text-gray-500 mb-1">
              Firestore <code className="bg-gray-100 px-1 rounded">users/{authUser.uid}</code> 문서가 없습니다.
            </p>
            <p className="text-xs text-gray-400">
              /setup 페이지에서 초기 세팅을 먼저 실행해주세요.
            </p>
          </div>
          <a
            href="/setup"
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            /setup 초기 세팅하기
          </a>
        </div>
      </AdminLayout>
    );
  }

  // ── 4단계: salonId 없음 ──────────────────────────────────────────────────
  if (!salonId) {
    return (
      <AdminLayout title="디자이너 관리" description="">
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle size={36} className="text-orange-400" />
          <p className="text-sm font-medium text-gray-700">매장 정보가 연결되지 않았습니다.</p>
          <p className="text-xs text-gray-500 font-mono">
            users/{userId}.salonId 를 확인해주세요.
          </p>
          <a href="/setup" className="text-sm text-blue-600 hover:underline mt-1">
            /setup 에서 다시 세팅하기
          </a>
        </div>
      </AdminLayout>
    );
  }

  // ── 5단계: 권한 없음 ────────────────────────────────────────────────────
  if (!canReadDesigners) {
    return (
      <AdminLayout title="디자이너 관리" description="">
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <ShieldOff size={36} className="text-red-400" />
          <p className="text-sm text-gray-600">접근 권한이 없습니다.</p>
        </div>
      </AdminLayout>
    );
  }

  // ── 정상 렌더 ───────────────────────────────────────────────────────────
  return (
    <AdminLayout
      title="디자이너 관리"
      description="디자이너별 근무시간, 휴무일, 담당 시술을 관리하세요."
    >
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm text-white ${
            toast.ok ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.text}
        </div>
      )}

      {/* 모달 */}
      {modalDesigner !== undefined && (
        <DesignerFormModal
          designer={modalDesigner}
          salonId={salonId}
          services={services}
          onClose={() => setModalDesigner(undefined)}
          onSaved={handleSaved}
          user={actingUser}
        />
      )}

      {deactivateTarget && (
        <DeactivateConfirmModal
          designer={deactivateTarget}
          onConfirm={handleDeactivate}
          onClose={() => setDeactivateTarget(null)}
          loading={deactivating}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">
              전체 {designers.length}명 · 근무 중{" "}
              {designers.filter((d) => d.status === "active").length}명
            </p>
            {/* 현재 권한 표시 */}
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              {ROLE_LABEL[userRole ?? "designer"]} 권한
            </span>
          </div>

          {/* 권한별 버튼 */}
          {canManageDesigners ? (
            <button
              onClick={() => setModalDesigner(null)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />디자이너 추가
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-400 border border-gray-200 px-4 py-2 rounded-lg bg-gray-50">
              <ShieldOff size={13} />
              디자이너 관리 (읽기 전용)
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {dataError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">데이터를 불러오지 못했습니다</p>
              <p className="text-xs text-red-500 mt-0.5">{dataError}</p>
            </div>
            <button
              onClick={loadData}
              className="ml-auto text-xs text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100 flex-shrink-0"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 로딩 */}
        {dataLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        )}

        {/* 디자이너 카드 */}
        {!dataLoading && !dataError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleDesigners.map((d) => {
              const todayR = reservations.filter((r) => r.designerId === d.id);
              const isInactive = d.status === "inactive";

              return (
                <div
                  key={d.id}
                  className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 transition-opacity ${
                    isInactive ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                        style={{ background: d.color }}
                      >
                        {d.profileInitial}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{d.name}</p>
                        <p className="text-xs text-gray-500">{d.roleTitle}</p>
                      </div>
                    </div>
                    {canManageDesigners && !isInactive && (
                      <button
                        onClick={() => setModalDesigner(d)}
                        className="text-gray-400 hover:text-gray-700 p-1"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <StatusDropdown
                      designer={d}
                      salonId={salonId}
                      user={actingUser}
                      canEdit={canManageDesigners && !isInactive}
                      onChange={loadDesigners}
                    />
                    <span className="text-xs text-gray-500">오늘 {todayR.length}건</span>
                  </div>

                  <div className="flex gap-1 mb-3">
                    {WEEK_LABELS.map((day, i) => (
                      <div
                        key={day}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                          d.workDays.includes(i)
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-50 text-gray-300"
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                    <Clock size={12} />
                    <span>{d.startTime} ~ {d.endTime}</span>
                  </div>

                  <div className="mb-2">
                    <div className="flex flex-wrap gap-1">
                      {d.services.slice(0, 3).map((s) => (
                        <span key={s} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                      {d.services.length > 3 && (
                        <span className="bg-gray-100 text-gray-400 text-[10px] px-2 py-0.5 rounded-full">
                          +{d.services.length - 3}
                        </span>
                      )}
                      {d.services.length === 0 && (
                        <span className="text-[10px] text-gray-300">담당 시술 없음</span>
                      )}
                    </div>
                  </div>

                  {d.daysOff.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-orange-500 mb-2">
                      <CalendarOff size={12} />
                      <span className="truncate">
                        {d.daysOff.slice(0, 2).join(", ")}
                        {d.daysOff.length > 2 ? ` 외 ${d.daysOff.length - 2}일` : ""}
                      </span>
                    </div>
                  )}

                  {d.memo && (
                    <p className="text-[10px] text-gray-400 italic truncate mb-2">{d.memo}</p>
                  )}

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      누적 {d.totalReservations ?? 0}건 · {d.joinedAt ?? "-"} 입사
                    </span>
                    {canDeactivateDesigner && !isInactive && (
                      <button
                        onClick={() => setDeactivateTarget(d)}
                        className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                      >
                        삭제
                      </button>
                    )}
                    {isInactive && (
                      <span className="text-[10px] text-gray-300">비활성</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 빈 상태 */}
            {visibleDesigners.length === 0 && (
              <div className="col-span-4 text-center py-16">
                <p className="text-sm text-gray-400 mb-3">등록된 디자이너가 없습니다.</p>
                {canManageDesigners ? (
                  <button
                    onClick={() => setModalDesigner(null)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    디자이너 추가하기
                  </button>
                ) : (
                  <p className="text-xs text-gray-400">관리자에게 디자이너 등록을 요청하세요.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 주간 근무시간표 */}
        {!dataLoading && !dataError && designers.filter((d) => d.status !== "inactive").length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">주간 근무시간표</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 600 }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium w-20">시간</th>
                    {designers
                      .filter((d) => d.status !== "inactive")
                      .map((d) => (
                        <th key={d.id} className="px-4 py-3 text-center text-gray-700 font-semibold">
                          <div className="flex items-center justify-center gap-1.5">
                            <div
                              className="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                              style={{ background: d.color }}
                            >
                              {d.profileInitial}
                            </div>
                            <span>{d.name}</span>
                            {d.status === "off" && (
                              <span className="text-[9px] text-yellow-600 bg-yellow-100 px-1 rounded">휴무</span>
                            )}
                          </div>
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"].map(
                    (time) => (
                      <tr key={time} className="border-t border-gray-50">
                        <td className="px-4 py-2.5 text-gray-400">{time}</td>
                        {designers
                          .filter((d) => d.status !== "inactive")
                          .map((d) => {
                            const hour = parseInt(time.split(":")[0]);
                            const start = parseInt(d.startTime.split(":")[0]);
                            const end = parseInt(d.endTime.split(":")[0]);
                            const isWorking =
                              d.status === "active" && hour >= start && hour < end;
                            const res = reservations.find(
                              (r) => r.designerId === d.id && parseInt(r.time.split(":")[0]) === hour
                            );
                            return (
                              <td key={d.id} className="px-2 py-1.5 text-center">
                                {res ? (
                                  <div
                                    className="rounded px-2 py-1 text-[10px] font-medium text-white"
                                    style={{ background: d.color }}
                                  >
                                    {res.customerName}
                                  </div>
                                ) : isWorking ? (
                                  <div className="h-5 rounded bg-gray-50 border border-gray-100" />
                                ) : (
                                  <div className="text-gray-200">—</div>
                                )}
                              </td>
                            );
                          })}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
