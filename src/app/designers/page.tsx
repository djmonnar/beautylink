"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { MOCK_DESIGNERS, MOCK_RESERVATIONS, Designer } from "@/data/mock";
import { Plus, Edit2, Clock, CalendarOff } from "lucide-react";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function DesignerModal({ designer, onClose }: { designer: Designer | null; onClose: () => void }) {
  const [form, setForm] = useState(designer ?? {
    id: "", name: "", roleTitle: "디자이너", status: "active" as const,
    phoneMasked: "", profileInitial: "", color: "#3b82f6",
    services: [], workDays: [1,2,3,4,5], startTime: "09:00",
    endTime: "19:00", daysOff: [], todayReservations: 0,
    totalReservations: 0, joinedAt: "",
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg text-gray-900 mb-5">{designer ? "디자이너 수정" : "디자이너 추가"}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">이름</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">직책</label>
            <input value={form.roleTitle} onChange={e => setForm({...form, roleTitle: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">근무 시작</label>
              <input type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">근무 종료</label>
              <input type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">근무 요일</label>
            <div className="flex gap-2">
              {WEEK.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    const days = form.workDays.includes(i)
                      ? form.workDays.filter(x => x !== i)
                      : [...form.workDays, i];
                    setForm({...form, workDays: days});
                  }}
                  className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${form.workDays.includes(i) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50">취소</button>
          <button onClick={onClose} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">저장</button>
        </div>
      </div>
    </div>
  );
}

export default function DesignersPage() {
  const [modalDesigner, setModalDesigner] = useState<Designer | null | undefined>(undefined);
  const todayDate = "2025-05-25";

  return (
    <AdminLayout title="디자이너 관리" description="디자이너별 근무시간, 휴무일, 담당 시술을 관리하세요.">
      {modalDesigner !== undefined && (
        <DesignerModal designer={modalDesigner} onClose={() => setModalDesigner(undefined)} />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div />
          <button
            onClick={() => setModalDesigner(null)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />디자이너 추가
          </button>
        </div>

        {/* Designer cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MOCK_DESIGNERS.map((d) => {
            const todayR = MOCK_RESERVATIONS.filter(r => r.designerId === d.id && r.date === todayDate);
            return (
              <div key={d.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: d.color }}>
                      {d.profileInitial}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-500">{d.roleTitle}</p>
                    </div>
                  </div>
                  <button onClick={() => setModalDesigner(d)} className="text-gray-400 hover:text-gray-700">
                    <Edit2 size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${d.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${d.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                    {d.status === "active" ? "근무 중" : "휴무"}
                  </span>
                  <span className="text-xs text-gray-500">오늘 {d.todayReservations}건</span>
                </div>

                {/* Work days */}
                <div className="flex gap-1 mb-4">
                  {WEEK.map((day, i) => (
                    <div
                      key={day}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${d.workDays.includes(i) ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-300"}`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Work time */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                  <Clock size={12} />
                  <span>{d.startTime} ~ {d.endTime}</span>
                </div>

                {/* Services */}
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1.5">담당 시술</p>
                  <div className="flex flex-wrap gap-1">
                    {d.services.slice(0, 3).map((s) => (
                      <span key={s} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                    {d.services.length > 3 && (
                      <span className="bg-gray-100 text-gray-400 text-[10px] px-2 py-0.5 rounded-full">+{d.services.length - 3}</span>
                    )}
                  </div>
                </div>

                {/* Days off */}
                {d.daysOff.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-orange-500">
                    <CalendarOff size={12} />
                    <span>휴무: {d.daysOff.join(", ")}</span>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  누적 예약 {d.totalReservations}건 · {d.joinedAt} 입사
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekly schedule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">주간 근무시간표</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 600 }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium w-20">시간</th>
                  {MOCK_DESIGNERS.map((d) => (
                    <th key={d.id} className="px-4 py-3 text-center text-gray-700 font-semibold">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: d.color }}>{d.profileInitial}</div>
                        {d.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time) => (
                  <tr key={time} className="border-t border-gray-50">
                    <td className="px-4 py-2.5 text-gray-400">{time}</td>
                    {MOCK_DESIGNERS.map((d) => {
                      const hour = parseInt(time.split(":")[0]);
                      const start = parseInt(d.startTime.split(":")[0]);
                      const end = parseInt(d.endTime.split(":")[0]);
                      const isWorking = d.status === "active" && hour >= start && hour < end;
                      const res = MOCK_RESERVATIONS.find(r => r.designerId === d.id && r.date === todayDate && parseInt(r.time.split(":")[0]) === hour);
                      return (
                        <td key={d.id} className="px-2 py-1.5 text-center">
                          {res ? (
                            <div className="rounded px-2 py-1 text-[10px] font-medium text-white" style={{ background: d.color }}>
                              {res.customerName}
                            </div>
                          ) : isWorking ? (
                            <div className="h-5 rounded bg-gray-50 border border-gray-100" />
                          ) : (
                            <div className="text-gray-200 text-center">—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
