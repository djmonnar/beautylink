"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { MOCK_CUSTOMERS, gradeColor, Customer } from "@/data/mock";
import { Search, Plus, MessageSquare, MoreHorizontal, Calendar } from "lucide-react";

function CustomerDetail({ c }: { c: Customer }) {
  return (
    <div className="flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      {/* Profile */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {c.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{c.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gradeColor(c.grade)}`}>{c.grade}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{c.phone}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {c.tags.map((t) => (
                <span key={t} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>
        </div>
        <button className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
          <MessageSquare size={14} />메시지
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visit history */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <Calendar size={14} className="text-blue-600" /> 방문 이력
          </h3>
          <div className="space-y-3">
            {c.visitHistory.map((v, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                  {i < c.visitHistory.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 mt-1" />}
                </div>
                <div className="pb-3 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-gray-900">{v.date}</span>
                    <span className="text-xs text-blue-600 font-medium">{v.price.toLocaleString()}원</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{v.serviceName}</p>
                  <p className="text-xs text-gray-500">{v.designerName}</p>
                  {v.memo && <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">{v.memo}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right info */}
        <div className="space-y-4">
          {/* Service memo */}
          {c.visitHistory[0] && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">시술 메모</h3>
              <div className="space-y-2">
                {c.visitHistory.slice(0, 3).map((v, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-xs">
                    <p className="text-gray-400 mb-1">{v.date} ({v.designerName})</p>
                    <p className="text-gray-700">{v.memo || "메모 없음"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preferred designer */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">선호 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 w-24 text-xs">선호 디자이너</span>
                <span className="text-gray-900 font-medium">{c.preferredDesignerName || "-"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 w-24 text-xs">모발 타입</span>
                <span className="text-gray-900">{c.hairType || "-"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 w-24 text-xs">특이사항</span>
                <span className="text-gray-900">{c.specialNote || "-"}</span>
              </div>
              {c.nextVisitDate && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 w-24 text-xs">다음 방문 예정</span>
                  <span className="text-blue-600 font-medium">{c.nextVisitDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600 mb-1">총 방문 횟수</p>
              <p className="text-xl font-bold text-blue-900">{c.totalVisits}회</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xs text-purple-600 mb-1">누적 결제 금액</p>
              <p className="text-sm font-bold text-purple-900">{c.totalSpent.toLocaleString()}원</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer>(MOCK_CUSTOMERS[0]);
  const [filter, setFilter] = useState<string>("전체");

  const filtered = MOCK_CUSTOMERS.filter((c) => {
    const matchSearch = c.name.includes(search) || c.phone.includes(search);
    const matchFilter = filter === "전체" || c.grade === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    전체: MOCK_CUSTOMERS.length,
    VIP: MOCK_CUSTOMERS.filter((c) => c.grade === "VIP").length,
    신규: MOCK_CUSTOMERS.filter((c) => c.grade === "신규").length,
    재방문: MOCK_CUSTOMERS.filter((c) => c.grade === "재방문").length,
  };

  return (
    <AdminLayout title="고객 관리" description="고객 정보를 조회하고 관리하세요.">
      <div className="flex gap-4 h-full flex-col lg:flex-row">
        {/* List panel */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">고객 목록</h2>
            <button className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
              <Plus size={12} />고객 등록
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="이름, 전화번호 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {Object.entries(counts).map(([label, count]) => (
              <button
                key={label}
                onClick={() => setFilter(label)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === label ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
              >
                {label} {count}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
              <option>최근 방문순</option>
              <option>이름순</option>
              <option>누적 금액순</option>
            </select>
          </div>

          {/* List */}
          <div className="space-y-1">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className={`p-3 rounded-xl cursor-pointer border transition-all ${selected.id === c.id ? "bg-blue-50 border-blue-200" : "bg-white border-transparent hover:border-gray-200 hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{c.name}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${gradeColor(c.grade)}`}>{c.grade}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{c.phone}</p>
                    <p className="text-xs text-gray-400">최근 방문 {c.lastVisitDate || "-"}</p>
                  </div>
                  <button className="text-gray-300 hover:text-gray-600 flex-shrink-0">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <CustomerDetail c={selected} />
      </div>
    </AdminLayout>
  );
}
