"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { getServices, saveServices, ServiceMenu, MOCK_DESIGNERS } from "@/data/mock";
import { Plus, Edit2, Search } from "lucide-react";

const CATEGORIES = ["전체", "컷", "펌", "염색", "클리닉", "두피케어", "기타"] as const;

type Category = typeof CATEGORIES[number];

function ServiceModal({ service, onClose, onSave }: {
  service: ServiceMenu | null;
  onClose: () => void;
  onSave: (s: ServiceMenu) => void;
}) {
  const [form, setForm] = useState<ServiceMenu>(service ?? {
    id: `s_${Date.now()}`,
    category: "컷",
    name: "",
    price: 0,
    duration: 60,
    assignedDesignerIds: [],
    active: true,
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg text-gray-900 mb-5">{service ? "메뉴 수정" : "새 메뉴 등록"}</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">카테고리</label>
              <select
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value as ServiceMenu["category"]})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {["컷","펌","염색","클리닉","두피케어","기타"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">메뉴명</label>
              <input
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="여성 컷"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">가격 (원)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm({...form, price: Number(e.target.value)})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">소요시간 (분)</label>
              <input
                type="number"
                value={form.duration}
                onChange={e => setForm({...form, duration: Number(e.target.value)})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">담당 디자이너</label>
            <div className="flex flex-wrap gap-2">
              {MOCK_DESIGNERS.map(d => (
                <label key={d.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.assignedDesignerIds.includes(d.id)}
                    onChange={e => {
                      const ids = e.target.checked
                        ? [...form.assignedDesignerIds, d.id]
                        : form.assignedDesignerIds.filter(id => id !== d.id);
                      setForm({...form, assignedDesignerIds: ids});
                    }}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{d.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">네이버 메뉴명 (연동 준비)</label>
            <input
              value={form.naverMenuName ?? ""}
              onChange={e => setForm({...form, naverMenuName: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="네이버예약 메뉴명"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50">취소</button>
          <button onClick={() => { onSave(form); onClose(); }} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">저장</button>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceMenu[]>([]);
  const [category, setCategory] = useState<Category>("전체");
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState<ServiceMenu | null>(null);
  const [modalService, setModalService] = useState<ServiceMenu | null | undefined>(undefined);

  useEffect(() => {
    setServices(getServices());
  }, []);

  function handleSave(s: ServiceMenu) {
    const updated = services.some(x => x.id === s.id)
      ? services.map(x => x.id === s.id ? s : x)
      : [...services, s];
    setServices(updated);
    saveServices(updated);
  }

  function toggleActive(id: string) {
    const updated = services.map(s => s.id === id ? {...s, active: !s.active} : s);
    setServices(updated);
    saveServices(updated);
  }

  const filtered = services.filter(s => {
    const matchCat = category === "전체" || s.category === category;
    const matchSearch = s.name.includes(search);
    return matchCat && matchSearch;
  });

  const CAT_COLORS: Record<string, string> = {
    컷: "bg-blue-100 text-blue-700",
    펌: "bg-purple-100 text-purple-700",
    염색: "bg-pink-100 text-pink-700",
    클리닉: "bg-green-100 text-green-700",
    두피케어: "bg-teal-100 text-teal-700",
    기타: "bg-gray-100 text-gray-600",
  };

  return (
    <AdminLayout title="시술 메뉴 관리" description="시술 메뉴, 가격, 소요시간을 관리하세요.">
      {modalService !== undefined && (
        <ServiceModal service={modalService} onClose={() => setModalService(undefined)} onSave={handleSave} />
      )}

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left: list */}
        <div className="flex-1 space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 overflow-x-auto">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === c ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-32">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="메뉴 검색"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setModalService(null)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              <Plus size={16} />새 메뉴 등록
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["카테고리", "메뉴명", "가격", "소요시간", "담당 디자이너", "네이버 매칭", "사용", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedService?.id === s.id ? "bg-blue-50" : ""} ${!s.active ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[s.category] ?? "bg-gray-100 text-gray-600"}`}>
                        {s.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-700">{s.price.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-gray-600">{s.duration}분</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {MOCK_DESIGNERS.filter(d => s.assignedDesignerIds.includes(d.id)).map(d => d.name).join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{s.naverMenuName ?? "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); toggleActive(s.id); }}
                        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${s.active ? "bg-blue-600" : "bg-gray-200"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${s.active ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); setModalService(s); }}
                        className="text-gray-400 hover:text-gray-700"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: detail */}
        {selectedService && (
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{selectedService.name}</h3>
                <button onClick={() => setModalService(selectedService)} className="text-blue-600 text-sm hover:underline">수정</button>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  { label: "카테고리", value: selectedService.category },
                  { label: "가격", value: `${selectedService.price.toLocaleString()}원` },
                  { label: "소요시간", value: `${selectedService.duration}분` },
                  { label: "사용 여부", value: selectedService.active ? "사용 중" : "비활성화" },
                  { label: "네이버 메뉴명", value: selectedService.naverMenuName ?? "-" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500 text-xs w-24">{label}</span>
                    <span className="font-medium text-gray-900">{value}</span>
                  </div>
                ))}
                <div>
                  <p className="text-gray-500 text-xs mb-2">담당 디자이너</p>
                  <div className="flex flex-wrap gap-1">
                    {MOCK_DESIGNERS.filter(d => selectedService.assignedDesignerIds.includes(d.id)).map(d => (
                      <span key={d.id} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{d.name}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
