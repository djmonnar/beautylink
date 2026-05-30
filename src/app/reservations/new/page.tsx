"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  CheckCircle,
  AlertCircle,
  Search,
  X,
  UserCheck,
  UserPlus,
  Loader2,
  ShieldOff,
  Calendar,
  Clock,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { addReservation, getReservations, logReservationAccess } from "@/services/reservations";
import { getDesigners } from "@/services/designers";
import { getServices } from "@/services/services";
import { getCustomers, addCustomer } from "@/services/customers";
import { maskPhone, calcEndAt } from "@/types";
import type { Reservation, Designer, ServiceMenu, Customer, PermissionRole } from "@/types";
import { getDesignerWorkStatus } from "@/lib/designerSchedule";

// ── 시간 슬롯: 09:00~20:50, 10분 간격 ─────────────────────────────────────
const TIME_SLOTS = Array.from({ length: 72 }, (_, i) => {
  const mins = 9 * 60 + i * 10;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

// ── Helpers ────────────────────────────────────────────────────────────────

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function calcEndTime(time: string, duration: number): string {
  const total = timeToMin(time) + duration;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({
  msg,
  ok,
  onClose,
}: {
  msg: string;
  ok: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
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

// ── NewCustomerModal ───────────────────────────────────────────────────────

interface NewCustomerModalProps {
  onClose: () => void;
  onCreated: (c: Customer) => void;
  salonId: string;
  createdBy?: string;
}

function NewCustomerModal({ onClose, onCreated, salonId, createdBy }: NewCustomerModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    let hasErr = false;
    if (!name.trim()) { setNameErr("고객명을 입력해주세요."); hasErr = true; }
    if (!phone.trim()) { setPhoneErr("연락처를 입력해주세요."); hasErr = true; }
    else if (!/^010-\d{4}-\d{4}$/.test(phone)) { setPhoneErr("010-0000-0000 형식으로 입력해주세요."); hasErr = true; }
    if (hasErr) return;

    setSaving(true);
    try {
      const custData: Omit<Customer, "id"> = {
        name: name.trim(),
        phoneMasked: maskPhone(phone),
        grade: "신규",
        tags: [],
        visitHistory: [],
        totalVisits: 0,
        totalSpent: 0,
        registeredAt: todayStr(),
      };
      const newId = await addCustomer(salonId, custData, { phoneRaw: phone });
      const newCustomer: Customer = { ...custData, id: newId };
      onCreated(newCustomer);
      onClose();
    } catch (err) {
      console.error(err);
      setPhoneErr("고객 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
    void createdBy; // suppress unused warning
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="font-bold text-base text-gray-900">새 고객 등록</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              고객명 <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setNameErr(""); }}
              placeholder="이수진"
              autoFocus
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${nameErr ? "border-red-400 bg-red-50" : "border-gray-200"}`}
            />
            {nameErr && <p className="text-xs text-red-500 mt-1">{nameErr}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              연락처 <span className="text-red-500">*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneErr(""); }}
              placeholder="010-1234-5678"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${phoneErr ? "border-red-400 bg-red-50" : "border-gray-200"}`}
            />
            {phoneErr && <p className="text-xs text-red-500 mt-1">{phoneErr}</p>}
          </div>
          <p className="text-xs text-gray-400">
            등록 후 즉시 예약 폼에 선택됩니다. 상세 정보는 고객 관리에서 수정할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" />저장 중...</> : "등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type FormState = {
  customerName: string;
  customerPhone: string;
  designerId: string;
  serviceId: string;
  date: string;
  time: string;
  source: Reservation["source"];
  status: Reservation["status"];
  note: string;
};

const INITIAL_FORM: FormState = {
  customerName: "",
  customerPhone: "",
  designerId: "",
  serviceId: "",
  date: todayStr(),
  time: "10:00",
  source: "phone",
  status: "confirmed",
  note: "",
};

export default function NewReservationPage() {
  const router = useRouter();
  const { user: authUser, userData, loading: authLoading } = useAuth();
  // salonId: 기본값 "salon1" 제거 — null이면 guard에서 차단
  const salonId = userData?.salonId ?? null;
  const userRole = userData?.role ?? null;

  // acting user for logs
  const actingRole: PermissionRole =
    userRole === "owner" ? "원장" : userRole === "manager" ? "매니저" : "디자이너";
  const actingUser = {
    uid: authUser?.uid ?? "",
    name: userData?.name ?? authUser?.email ?? "",
    role: actingRole,
  };

  // Data
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [services, setServices] = useState<ServiceMenu[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Customer search
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);

  // Form
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Post-save state
  const [savedReservationId, setSavedReservationId] = useState<string | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
  }

  // Load data
  const loadData = useCallback(async () => {
    // salonId 없으면 Firestore 조회하지 않음
    if (!salonId) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const dsgs = await getDesigners(salonId);
      setDesigners(dsgs);
    } catch (err) {
      console.error(err);
      setDataError("데이터를 불러오지 못했습니다. 페이지를 새로고침해주세요.");
    } finally {
      setDataLoading(false);
    }
    Promise.allSettled([
      getServices(salonId).then(setServices),
      getCustomers(salonId).then(setCustomers),
    ]).catch(() => {});
  }, [salonId]);

  useEffect(() => {
    if (!authLoading && authUser) {
      if (salonId) {
        loadData();
      } else {
        setDataLoading(false);
      }
    }
  }, [authLoading, authUser, salonId, loadData]);

  // Designer role: force own designerId
  useEffect(() => {
    if (userRole === "designer" && userData?.designerId) {
      setForm((f) => ({ ...f, designerId: userData.designerId! }));
    }
  }, [userRole, userData?.designerId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <AdminLayout title="예약 등록" description="">
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
      <AdminLayout title="예약 등록" description="">
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

  // salonId 없으면 임의 저장 방지
  if (!salonId) {
    return (
      <AdminLayout title="예약 등록" description="">
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

  // Designer role with no designerId assigned
  if (userRole === "designer" && !userData.designerId) {
    return (
      <AdminLayout title="예약 등록" description="">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <ShieldOff size={36} className="text-red-500" />
          <p className="font-medium text-gray-700">디자이너 계정이 연결되지 않았습니다.</p>
          <p className="text-sm text-gray-500">관리자에게 디자이너 계정 연결을 요청해주세요.</p>
        </div>
      </AdminLayout>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const isDesignerRole = userRole === "designer";

  // non-inactive designers
  const availableDesigners = designers.filter((d) => d.status !== "inactive");
  // active services
  const activeServices = services.filter((s) => s.active);

  // Bidirectional filtering
  const filteredDesigners = form.serviceId
    ? availableDesigners.filter((d) => {
        const svc = services.find((s) => s.id === form.serviceId);
        return !svc || svc.assignedDesignerIds.includes(d.id);
      })
    : availableDesigners;

  const filteredServices = form.designerId
    ? activeServices.filter((s) => s.assignedDesignerIds.includes(form.designerId))
    : activeServices;

  const selectedDesigner = designers.find((d) => d.id === form.designerId) ?? null;
  const selectedService = services.find((s) => s.id === form.serviceId) ?? null;

  // Endtime display
  const endTime = form.time && selectedService
    ? calcEndTime(form.time, selectedService.duration)
    : null;

  // Designer warnings — getDesignerWorkStatus 공유 헬퍼 사용
  const selectedDate = form.date;
  // 날짜 문자열을 로컬 시간으로 파싱 (T00:00:00 추가로 UTC 오프셋 방지)
  const selectedDateObj = new Date(selectedDate + "T00:00:00");

  const designerWorkStatus = selectedDesigner
    ? getDesignerWorkStatus(selectedDesigner, selectedDateObj)
    : null;

  // 하위 호환을 위한 파생 값 (저장 차단 로직에서 사용)
  const designerIsOff      = designerWorkStatus === "off";
  const designerOnDayOff   = designerWorkStatus === "day_off";
  const designerNotWorkDay = designerWorkStatus === "non_work_day";

  const designerWarning = selectedDesigner
    ? designerIsOff
      ? `${selectedDesigner.name} 디자이너는 현재 휴무 상태입니다.`
      : designerOnDayOff
      ? `${selectedDesigner.name} 디자이너는 ${selectedDate}에 특정 휴무일입니다.`
      : designerNotWorkDay
      ? `${selectedDesigner.name} 디자이너의 근무일이 아닙니다 (근무: ${
          selectedDesigner.workDays
            .map((d) => ["일", "월", "화", "수", "목", "금", "토"][d])
            .join(", ")
        }).`
      : null
    : null;

  // Filtered customer dropdown
  const filteredCustomers = customers
    .filter((c) => {
      const q = customerSearch.toLowerCase();
      return c.name.includes(q) || c.phoneMasked.includes(q);
    })
    .slice(0, 8);

  // ── Customer handlers ──────────────────────────────────────────────────────

  function handleSelectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setCustomerSearch(c.name);
    setDropdownOpen(false);
    setForm((f) => ({ ...f, customerName: c.name, customerPhone: "" }));
    setErrors((e) => ({ ...e, customerName: "", customerPhone: "" }));
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setForm((f) => ({ ...f, customerName: "", customerPhone: "" }));
  }

  function handleNewCustomerCreated(c: Customer) {
    setCustomers((prev) => [c, ...prev]);
    handleSelectCustomer(c);
    showToast(`${c.name} 고객이 등록되었습니다.`);
  }

  // ── Designer/service change ─────────────────────────────────────────────────

  function handleDesignerChange(designerId: string) {
    // If the current serviceId is no longer valid for this designer, clear it
    const svcStillValid = !designerId || activeServices
      .filter((s) => s.assignedDesignerIds.includes(designerId))
      .some((s) => s.id === form.serviceId);
    setForm((f) => ({
      ...f,
      designerId,
      serviceId: svcStillValid ? f.serviceId : "",
    }));
    setErrors((e) => ({ ...e, designerId: "" }));
  }

  function handleServiceChange(serviceId: string) {
    const svc = services.find((s) => s.id === serviceId) ?? null;
    setForm((f) => ({
      ...f,
      serviceId,
    }));
    setErrors((e) => ({ ...e, serviceId: "" }));
    void svc; // price/duration auto-fill is done via selectedService derived above
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.customerName.trim()) e.customerName = "고객명을 입력해주세요.";
    if (!selectedCustomer) {
      if (!form.customerPhone.trim()) e.customerPhone = "연락처를 입력해주세요.";
      else if (!/^010-\d{4}-\d{4}$/.test(form.customerPhone))
        e.customerPhone = "010-0000-0000 형식으로 입력해주세요.";
    }
    if (!form.designerId) e.designerId = "담당 디자이너를 선택해주세요.";
    if (!form.serviceId) e.serviceId = "시술 메뉴를 선택해주세요.";
    if (!form.date) e.date = "예약 날짜를 선택해주세요.";
    if (!form.time) e.time = "예약 시간을 선택해주세요.";
    return e;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // 렌더 가드 이후에도 함수 내에서 재확인 (TypeScript narrowing)
    if (!salonId) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    // ── 휴무/비근무 체크 (save block) ──────────────────────────────
    if (selectedDesigner) {
      if (designerIsOff) {
        setErrors({ designerId: "휴무 상태인 디자이너에게는 예약을 등록할 수 없습니다." });
        return;
      }
      if (designerOnDayOff) {
        setErrors({ designerId: `${selectedDate}은(는) ${selectedDesigner.name} 디자이너의 특정 휴무일입니다.` });
        return;
      }
      if (designerNotWorkDay) {
        setErrors({ designerId: `${selectedDesigner.name} 디자이너의 근무일이 아닙니다.` });
        return;
      }
    }

    setSaving(true);
    try {
      // ── 중복 예약 체크 ────────────────────────────────────────────
      const existingReservations = await getReservations(salonId, form.date);
      const duration = selectedService?.duration ?? 60;
      const newStart = timeToMin(form.time);
      const newEnd = newStart + duration;

      const conflict = existingReservations.find((r) => {
        if (r.designerId !== form.designerId) return false;
        if (r.status === "cancelled") return false;
        const rStart = timeToMin(r.time);
        const rEnd = rStart + (r.duration ?? 60);
        return newStart < rEnd && newEnd > rStart;
      });

      if (conflict) {
        setErrors({
          time: `해당 시간에 이미 예약이 있습니다. (${conflict.customerName} ${conflict.time} - ${calcEndTime(conflict.time, conflict.duration ?? 60)})`,
        });
        setSaving(false);
        return;
      }

      // ── 저장 데이터 구성 ─────────────────────────────────────────
      const customerPhoneMasked = selectedCustomer
        ? selectedCustomer.phoneMasked
        : form.customerPhone.replace(/(\d{3})-(\d{4})-(\d{4})/, "$1-****-$3");

      const customerId = selectedCustomer ? selectedCustomer.id : `c_${Date.now()}`;
      const startAt = `${form.date}T${form.time}:00`;
      const endAt = calcEndAt(form.date, form.time, duration);

      const data: Omit<Reservation, "id"> = {
        customerId,
        customerName: form.customerName,
        customerPhoneMasked,
        designerId: form.designerId,
        designerName: selectedDesigner?.name ?? "",
        serviceId: form.serviceId,
        serviceName: selectedService?.name ?? "",
        date: form.date,
        time: form.time,
        startAt,
        endAt,
        duration,
        source: form.source,
        status: form.status,
        note: form.note,
        price: selectedService?.price ?? 0,
        createdBy: actingUser.uid,
      };

      const newId = await addReservation(salonId, data, actingUser.uid);

      // ── 접근 로그 (non-blocking) ──────────────────────────────────
      logReservationAccess(salonId, "reservation_created", newId, actingUser);

      setSavedReservationId(newId);
      showToast("예약이 등록되었습니다.");
    } catch (err) {
      console.error(err);
      showToast("예약 등록에 실패했습니다. 다시 시도해주세요.", false);
    } finally {
      setSaving(false);
    }
  }

  // ── Post-save actions ──────────────────────────────────────────────────────

  function handleResetForSameCustomer() {
    const customer = selectedCustomer;
    const search = customerSearch;
    setForm({
      ...INITIAL_FORM,
      customerName: form.customerName,
      designerId: isDesignerRole ? (userData?.designerId ?? "") : "",
    });
    setErrors({});
    setSavedReservationId(null);
    // Re-select the same customer
    if (customer) {
      setSelectedCustomer(customer);
      setCustomerSearch(search);
    }
  }

  function handleResetFull() {
    setForm({
      ...INITIAL_FORM,
      designerId: isDesignerRole ? (userData?.designerId ?? "") : "",
    });
    setErrors({});
    setSavedReservationId(null);
    clearCustomer();
  }

  // ── Input class helper ─────────────────────────────────────────────────────

  const inputClass = (field: string) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
    }`;

  // ── Post-save panel ────────────────────────────────────────────────────────

  if (savedReservationId) {
    return (
      <AdminLayout
        title="예약 등록"
        description="전화예약 또는 방문예약을 등록하고 관리할 수 있습니다."
      >
        {toast && (
          <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />
        )}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">예약이 등록되었습니다</h2>
            <p className="text-sm text-gray-500 mb-1">
              {form.customerName} 고객 · {selectedDesigner?.name ?? ""}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {form.date} {form.time}{endTime ? ` → ${endTime}` : ""} · {selectedService?.name ?? ""}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => router.push("/calendar")}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Calendar size={16} />
                캘린더로 이동
                <ArrowRight size={16} />
              </button>
              <button
                onClick={handleResetForSameCustomer}
                className="w-full flex items-center justify-center gap-2 border border-blue-200 text-blue-600 py-3 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                <UserCheck size={16} />
                같은 고객으로 추가 예약
              </button>
              <button
                onClick={handleResetFull}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <RotateCcw size={16} />
                폼 초기화 (새 예약)
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── Form render ────────────────────────────────────────────────────────────

  return (
    <AdminLayout
      title="예약 등록"
      description="전화예약 또는 방문예약을 등록하고 관리할 수 있습니다."
    >
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />
      )}

      {showNewCustomerModal && (
        <NewCustomerModal
          salonId={salonId}
          createdBy={actingUser.uid}
          onClose={() => setShowNewCustomerModal(false)}
          onCreated={handleNewCustomerCreated}
        />
      )}

      {/* Data loading error */}
      {dataError && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="flex-shrink-0" />
          {dataError}
          <button onClick={loadData} className="ml-auto text-red-600 underline text-xs">
            다시 시도
          </button>
        </div>
      )}

      {dataLoading && (
        <div className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
          <Loader2 size={16} className="animate-spin flex-shrink-0" />
          디자이너, 시술 메뉴, 고객 데이터를 불러오는 중...
        </div>
      )}

      {/* Designer role notice */}
      {isDesignerRole && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <AlertCircle size={16} className="flex-shrink-0" />
          디자이너 계정으로 로그인되어 있습니다. 본인 예약만 등록할 수 있습니다.
        </div>
      )}

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* ── Form ── */}
        <div className="flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* 고객 정보 */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                고객 정보
              </h3>
              <div className="space-y-4">
                {/* 기존 고객 검색 */}
                <div ref={searchRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    기존 고객 검색
                    <span className="ml-2 text-xs font-normal text-gray-400">(선택 시 아래 필드 자동 입력)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setDropdownOpen(true);
                          if (!e.target.value) clearCustomer();
                        }}
                        onFocus={() => setDropdownOpen(true)}
                        placeholder="이름 또는 전화번호로 검색..."
                        className={`w-full pl-9 pr-9 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          selectedCustomer ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                        }`}
                      />
                      {(customerSearch || selectedCustomer) && (
                        <button
                          type="button"
                          onClick={clearCustomer}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerModal(true)}
                      className="flex items-center gap-1.5 border border-blue-200 text-blue-600 px-3 py-2.5 rounded-lg text-sm hover:bg-blue-50 transition-colors flex-shrink-0"
                    >
                      <UserPlus size={14} />
                      새 고객
                    </button>
                  </div>

                  {/* 선택됨 배지 */}
                  {selectedCustomer && (
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-200">
                      <UserCheck size={13} />
                      <span className="font-medium">{selectedCustomer.name}</span>
                      <span className="text-blue-500">{selectedCustomer.phoneMasked}</span>
                      <span className="text-blue-400">({selectedCustomer.grade})</span>
                    </div>
                  )}

                  {/* 드롭다운 */}
                  {dropdownOpen && customerSearch && !selectedCustomer && (
                    <div className="absolute top-full left-0 right-16 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                      {filteredCustomers.length === 0 ? (
                        <div className="px-4 py-3 flex items-center justify-between">
                          <span className="text-sm text-gray-400">검색 결과가 없습니다.</span>
                          <button
                            type="button"
                            onClick={() => { setDropdownOpen(false); setShowNewCustomerModal(true); }}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <UserPlus size={12} />새 고객 등록
                          </button>
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                          >
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {c.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{c.name}</p>
                              <p className="text-xs text-gray-500">{c.phoneMasked}</p>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              c.grade === "VIP" ? "bg-amber-100 text-amber-700"
                              : c.grade === "신규" ? "bg-blue-100 text-blue-700"
                              : c.grade === "재방문" ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                            }`}>{c.grade}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 고객명 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      고객명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="이수진"
                      value={form.customerName}
                      onChange={(e) => { setForm({ ...form, customerName: e.target.value }); setErrors({ ...errors, customerName: "" }); }}
                      readOnly={!!selectedCustomer}
                      className={`${inputClass("customerName")} ${selectedCustomer ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
                    />
                    {errors.customerName && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />{errors.customerName}
                      </p>
                    )}
                  </div>

                  {/* 연락처 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      연락처{!selectedCustomer && <span className="text-red-500"> *</span>}
                    </label>
                    {selectedCustomer ? (
                      <div className="border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400">
                        {selectedCustomer.phoneMasked}
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="010-1234-5678"
                          value={form.customerPhone}
                          onChange={(e) => { setForm({ ...form, customerPhone: e.target.value }); setErrors({ ...errors, customerPhone: "" }); }}
                          className={inputClass("customerPhone")}
                        />
                        {errors.customerPhone && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle size={12} />{errors.customerPhone}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 예약 정보 */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                예약 정보
              </h3>
              <div className="space-y-4">

                {/* 날짜를 먼저 배치 — 디자이너 경고에 날짜가 필요하므로 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      예약 날짜 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => { setForm({ ...form, date: e.target.value }); setErrors({ ...errors, date: "" }); }}
                      className={inputClass("date")}
                    />
                    {errors.date && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />{errors.date}
                      </p>
                    )}
                  </div>

                  {/* 예약 경로 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">예약 경로</label>
                    <select
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value as Reservation["source"] })}
                      className={inputClass("source")}
                    >
                      <option value="phone">전화예약</option>
                      <option value="visit">방문예약</option>
                      <option value="kakao">카카오톡 문의</option>
                      <option value="naver">네이버예약 (연동 준비중)</option>
                    </select>
                  </div>
                </div>

                {/* 담당 디자이너 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    담당 디자이너 <span className="text-red-500">*</span>
                    {form.serviceId && filteredDesigners.length < availableDesigners.length && (
                      <span className="ml-2 text-xs font-normal text-blue-600">
                        (선택한 시술 가능 디자이너만 표시)
                      </span>
                    )}
                  </label>
                  {isDesignerRole ? (
                    <div className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-600">
                      {selectedDesigner?.name ?? "디자이너 미연결"} ({selectedDesigner?.roleTitle ?? ""})
                    </div>
                  ) : (
                    <select
                      value={form.designerId}
                      onChange={(e) => handleDesignerChange(e.target.value)}
                      className={inputClass("designerId")}
                    >
                      <option value="">디자이너 선택</option>
                      {filteredDesigners.map((d) => {
                        const dateObj = new Date(form.date + "T00:00:00");
                        const ws = getDesignerWorkStatus(d, dateObj);
                        const badge =
                          ws === "off"          ? " [휴무]"
                          : ws === "day_off"    ? " [특정휴무]"
                          : ws === "non_work_day" ? " [비근무]"
                          : "";
                        return (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.roleTitle}{badge}
                          </option>
                        );
                      })}
                    </select>
                  )}
                  {errors.designerId && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />{errors.designerId}
                    </p>
                  )}
                  {/* 휴무/비근무 경고 */}
                  {designerWarning && !errors.designerId && (
                    <div className="mt-1.5 flex items-start gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg px-3 py-2 text-xs">
                      <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                      {designerWarning}
                    </div>
                  )}
                </div>

                {/* 시술 메뉴 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    시술 메뉴 <span className="text-red-500">*</span>
                    {form.designerId && filteredServices.length < activeServices.length && (
                      <span className="ml-2 text-xs font-normal text-blue-600">
                        (선택한 디자이너 가능 메뉴만 표시)
                      </span>
                    )}
                  </label>
                  <select
                    value={form.serviceId}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className={inputClass("serviceId")}
                  >
                    <option value="">시술 선택</option>
                    {filteredServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.price.toLocaleString()}원 · {fmtDuration(s.duration)})
                      </option>
                    ))}
                  </select>
                  {errors.serviceId && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />{errors.serviceId}
                    </p>
                  )}
                  {/* 자동 반영 정보 */}
                  {selectedService && (
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      <span>가격: <strong className="text-gray-900">{selectedService.price.toLocaleString()}원</strong></span>
                      <span>·</span>
                      <span>소요시간: <strong className="text-gray-900">{fmtDuration(selectedService.duration)}</strong></span>
                      {endTime && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            <strong className="text-gray-900">{form.time} → {endTime}</strong>
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 예약 시간 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    예약 시간 <span className="text-red-500">*</span>
                    <span className="ml-1 text-gray-400 font-normal text-xs">(선택: {form.time}{endTime ? ` → ${endTime}` : ""})</span>
                  </label>
                  <div className={`grid grid-cols-6 gap-1 p-2.5 border rounded-lg max-h-44 overflow-y-auto ${errors.time ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"}`}>
                    {TIME_SLOTS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setForm({ ...form, time: t }); setErrors({ ...errors, time: "" }); }}
                        className={`py-1 rounded-md text-[11px] font-medium transition-colors ${
                          form.time === t
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {errors.time && (
                    <p className="text-xs text-red-500 mt-1 flex items-start gap-1">
                      <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />{errors.time}
                    </p>
                  )}
                </div>

                {/* 예약 상태 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">예약 상태</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Reservation["status"] })}
                    className={inputClass("status")}
                  >
                    <option value="confirmed">예약 확정</option>
                    <option value="pending">대기</option>
                    <option value="cancelled">취소</option>
                  </select>
                </div>

                {/* 요청사항 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">요청사항 (선택)</label>
                  <textarea
                    rows={3}
                    placeholder="받은 에쉬 톤 희망, 두피가 예민해요."
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{form.note.length}/200</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 size={16} className="animate-spin" />저장 중...</> : "저장"}
              </button>
            </div>
          </form>
        </div>

        {/* ── 미리보기 ── */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">예약 요약</h3>

            {/* 시간 미리보기 */}
            {selectedService && form.time && (
              <div className="bg-blue-50 rounded-xl p-3 mb-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: selectedDesigner?.color ?? "#3b82f6" }}>
                  <span className="text-white text-xs font-bold">
                    {selectedDesigner?.profileInitial ?? "?"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-blue-900 truncate">
                    {form.customerName || "고객 미선택"}
                  </p>
                  <p className="text-xs text-blue-700">
                    {form.time}{endTime ? ` → ${endTime}` : ""} · {fmtDuration(selectedService.duration)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2 text-sm">
              {[
                { label: "예약 일시", value: form.date && form.time ? `${form.date} ${form.time}` : "-" },
                { label: "종료 시간", value: endTime ?? "-" },
                { label: "시술 메뉴", value: selectedService?.name ?? "-" },
                { label: "소요시간", value: selectedService ? fmtDuration(selectedService.duration) : "-" },
                { label: "가격", value: selectedService ? `${selectedService.price.toLocaleString()}원` : "-" },
                { label: "담당 디자이너", value: selectedDesigner?.name ?? "-" },
                {
                  label: "예약 경로",
                  value: form.source === "phone" ? "전화예약"
                    : form.source === "visit" ? "방문예약"
                    : form.source === "kakao" ? "카카오톡 문의"
                    : "네이버예약 (준비중)",
                },
                {
                  label: "상태",
                  value: form.status === "confirmed" ? "예약 확정"
                    : form.status === "pending" ? "대기"
                    : "취소",
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 text-xs w-24">{label}</span>
                  <span className="text-gray-900 text-xs font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* 중복/휴무 경고 요약 */}
            {designerWarning && (
              <div className="mt-4 flex items-start gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
                <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                {designerWarning}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
