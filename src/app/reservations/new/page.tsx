"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/layout/AdminLayout";
import { CheckCircle, AlertCircle, Search, X, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { addReservation } from "@/services/reservations";
import { getDesigners } from "@/services/designers";
import { getServices } from "@/services/services";
import { getCustomers } from "@/services/customers";
import type { Reservation, Designer, ServiceMenu, Customer } from "@/types";

// 09:00 ~ 20:50, 10분 간격 (72 슬롯)
const TIME_SLOTS = Array.from({ length: 72 }, (_, i) => {
  const mins = 9 * 60 + i * 10;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

export default function NewReservationPage() {
  const router = useRouter();
  const { userData } = useAuth();
  const salonId = userData?.salonId ?? "salon1";

  const [designers, setDesigners] = useState<Designer[]>([]);
  const [services, setServices] = useState<ServiceMenu[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // 기존 고객 검색
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    designerId: "",
    serviceId: "",
    date: new Date().toISOString().split("T")[0],
    time: "10:00",
    source: "phone" as Reservation["source"],
    status: "confirmed" as Reservation["status"],
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDesigners(salonId).then(setDesigners);
    getServices(salonId).then(setServices);
    getCustomers(salonId).then(setCustomers);
  }, [salonId]);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return (
      c.name.includes(q) ||
      c.phoneMasked.includes(q)
    );
  }).slice(0, 8);

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

  const selectedDesigner = designers.find((d) => d.id === form.designerId);
  const selectedService = services.find((s) => s.id === form.serviceId);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.customerName.trim()) e.customerName = "고객명을 입력해주세요.";
    if (!selectedCustomer) {
      // 직접 입력 시 전화번호 필수
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);

    const customerPhoneMasked = selectedCustomer
      ? selectedCustomer.phoneMasked
      : form.customerPhone.replace(/(\d{3})-(\d{4})-(\d{4})/, "$1-****-$3");

    const customerId = selectedCustomer
      ? selectedCustomer.id
      : `c_${Date.now()}`;

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
      duration: selectedService?.duration ?? 60,
      source: form.source,
      status: form.status,
      note: form.note,
      price: selectedService?.price ?? 0,
    };

    await addReservation(salonId, data);
    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push("/calendar"), 1500);
  }

  const inputClass = (field: string) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
    }`;

  return (
    <AdminLayout
      title="예약 등록 / 수정"
      description="전화예약 또는 방문예약을 등록하고 관리할 수 있습니다."
    >
      {saved && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle size={18} />
          예약이 등록되었습니다. 캘린더로 이동합니다.
        </div>
      )}

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Form */}
        <div className="flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      (선택 시 아래 필드 자동 입력)
                    </span>
                  </label>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
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
                        selectedCustomer
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 bg-white"
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
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                      {filteredCustomers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">
                          검색 결과가 없습니다.
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
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                c.grade === "VIP"
                                  ? "bg-amber-100 text-amber-700"
                                  : c.grade === "신규"
                                  ? "bg-blue-100 text-blue-700"
                                  : c.grade === "재방문"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {c.grade}
                            </span>
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
                      onChange={(e) => {
                        setForm({ ...form, customerName: e.target.value });
                        setErrors({ ...errors, customerName: "" });
                      }}
                      readOnly={!!selectedCustomer}
                      className={`${inputClass("customerName")} ${
                        selectedCustomer ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""
                      }`}
                    />
                    {errors.customerName && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors.customerName}
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
                          onChange={(e) => {
                            setForm({ ...form, customerPhone: e.target.value });
                            setErrors({ ...errors, customerPhone: "" });
                          }}
                          className={inputClass("customerPhone")}
                        />
                        {errors.customerPhone && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle size={12} />
                            {errors.customerPhone}
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
                {/* 담당 디자이너 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    담당 디자이너 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.designerId}
                    onChange={(e) => {
                      setForm({ ...form, designerId: e.target.value, serviceId: "" });
                      setErrors({ ...errors, designerId: "" });
                    }}
                    className={inputClass("designerId")}
                  >
                    <option value="">디자이너 선택</option>
                    {designers
                      .filter((d) => d.status === "active")
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.roleTitle}
                        </option>
                      ))}
                  </select>
                  {errors.designerId && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errors.designerId}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 시술 메뉴 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      시술 메뉴 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.serviceId}
                      onChange={(e) => {
                        setForm({ ...form, serviceId: e.target.value });
                        setErrors({ ...errors, serviceId: "" });
                      }}
                      className={inputClass("serviceId")}
                    >
                      <option value="">시술 선택</option>
                      {services
                        .filter(
                          (s) =>
                            s.active &&
                            (!form.designerId ||
                              s.assignedDesignerIds.includes(form.designerId))
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.price.toLocaleString()}원)
                          </option>
                        ))}
                    </select>
                    {errors.serviceId && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors.serviceId}
                      </p>
                    )}
                  </div>
                  {/* 소요시간 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      소요시간
                    </label>
                    <div className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-600">
                      {selectedService
                        ? `${selectedService.duration}분`
                        : "시술 선택 후 자동 입력"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 예약 날짜 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      예약 날짜 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => {
                        setForm({ ...form, date: e.target.value });
                        setErrors({ ...errors, date: "" });
                      }}
                      className={inputClass("date")}
                    />
                  </div>

                  {/* 예약 시간 (10분 단위) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      예약 시간 <span className="text-red-500">*</span>
                      <span className="ml-1 text-gray-400 font-normal text-xs">
                        (선택: {form.time})
                      </span>
                    </label>
                    <div
                      className={`grid grid-cols-6 gap-1 p-2.5 border rounded-lg max-h-44 overflow-y-auto ${
                        errors.time
                          ? "border-red-400 bg-red-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      {TIME_SLOTS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, time: t });
                            setErrors({ ...errors, time: "" });
                          }}
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
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors.time}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 예약 경로 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      예약 경로
                    </label>
                    <select
                      value={form.source}
                      onChange={(e) =>
                        setForm({ ...form, source: e.target.value as Reservation["source"] })
                      }
                      className={inputClass("source")}
                    >
                      <option value="phone">전화예약</option>
                      <option value="visit">방문예약</option>
                      <option value="kakao">카카오톡</option>
                      <option value="naver">네이버예약 (연동 준비중)</option>
                    </select>
                  </div>
                  {/* 예약 상태 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      예약 상태
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value as Reservation["status"] })
                      }
                      className={inputClass("status")}
                    >
                      <option value="confirmed">예약 확정</option>
                      <option value="pending">대기</option>
                      <option value="cancelled">취소</option>
                    </select>
                  </div>
                </div>

                {/* 요청사항 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    요청사항 (선택)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="받은 에쉬 톤 희망, 두피가 예민해요."
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">
                    {form.note.length}/200
                  </p>
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
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>

        {/* 미리보기 */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">
              캘린더 반영 미리보기
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="text-center mb-3">
                <p className="font-semibold text-gray-900">
                  {form.date || "날짜 선택 필요"}
                </p>
              </div>
              <div className="space-y-1">
                {["13:00", "14:00", "15:00", "16:00"].map((t) => {
                  const isSelected = t === form.time.substring(0, 2) + ":00";
                  return (
                    <div
                      key={t}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                        isSelected
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-white border border-gray-100"
                      }`}
                    >
                      <span
                        className={`w-10 ${
                          isSelected ? "text-blue-700 font-semibold" : "text-gray-400"
                        }`}
                      >
                        {t}
                      </span>
                      {isSelected && form.customerName && (
                        <div>
                          <p className="font-semibold text-blue-800">{form.customerName}</p>
                          {selectedService && (
                            <p className="text-blue-600">{selectedService.name}</p>
                          )}
                          <p className="text-blue-500">
                            {form.source === "phone"
                              ? "전화예약"
                              : form.source === "visit"
                              ? "방문예약"
                              : form.source === "kakao"
                              ? "카카오"
                              : "네이버예약"}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {[
                {
                  label: "예약 일시",
                  value:
                    form.date && form.time ? `${form.date} ${form.time}` : "-",
                },
                { label: "시술 메뉴", value: selectedService?.name ?? "-" },
                { label: "담당 디자이너", value: selectedDesigner?.name ?? "-" },
                {
                  label: "예약 경로",
                  value:
                    form.source === "phone"
                      ? "전화예약"
                      : form.source === "visit"
                      ? "방문예약"
                      : form.source === "kakao"
                      ? "카카오"
                      : "네이버예약 (준비중)",
                },
                {
                  label: "상태",
                  value:
                    form.status === "confirmed"
                      ? "예약 확정"
                      : form.status === "pending"
                      ? "대기"
                      : "취소",
                },
                {
                  label: "금액",
                  value: selectedService
                    ? `${selectedService.price.toLocaleString()}원`
                    : "-",
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0"
                >
                  <span className="text-gray-500 text-xs w-24">{label}</span>
                  <span className="text-gray-900 text-xs font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
