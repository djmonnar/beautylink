"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { MOCK_MESSAGE_LOGS, MOCK_RESERVATIONS, CANCEL_REASON_DATA } from "@/data/mock";
import { MessageSquare, Bell, Send, AlertTriangle, CheckCircle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const TEMPLATES = [
  {
    type: "reservation_confirm" as const,
    title: "예약 확정 알림",
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    content: "[뷰티링크] 예약이 확정되었습니다.\n📅 {{date}} {{time}}\n💇 {{service}}\n👤 {{designer}} 디자이너\n감사합니다!",
  },
  {
    type: "reminder" as const,
    title: "전날 리마인드",
    icon: Bell,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    content: "[뷰티링크] 내일 예약을 잊지 마세요!\n📅 {{date}} {{time}}\n💇 {{service}}\n위치: 뷰티링크 헤어 강남점",
  },
  {
    type: "cancel" as const,
    title: "변경·취소 안내",
    icon: MessageSquare,
    color: "text-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    content: "[뷰티링크] 예약 취소가 완료되었습니다.\n취소된 예약: {{date}} {{time}} {{service}}\n다음에 또 방문해 주세요!",
  },
  {
    type: "noshow" as const,
    title: "노쇼 안내",
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    content: "[뷰티링크] 오늘 예약에 방문하지 않으셨습니다.\n재예약을 원하시면 전화 또는 카카오로 문의해 주세요.",
  },
];

const STATS_30 = [
  { day: "5/1", 알림: 12, 노쇼: 1 },
  { day: "5/5", 알림: 18, 노쇼: 2 },
  { day: "5/10", 알림: 15, 노쇼: 0 },
  { day: "5/15", 알림: 22, 노쇼: 3 },
  { day: "5/20", 알림: 19, 노쇼: 1 },
  { day: "5/25", 알림: 24, 노쇼: 2 },
];

export default function MessagesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [sendToast, setSendToast] = useState(false);

  const noshowRes = MOCK_RESERVATIONS.filter(r => r.status === "noshow");

  function handleSend() {
    setSendToast(true);
    setTimeout(() => setSendToast(false), 2500);
  }

  return (
    <AdminLayout title="문자·알림톡·노쇼 관리" description="예약 알림, 리마인드, 취소 안내, 노쇼 관리를 한 화면에서 처리하세요.">
      {sendToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm">
          <Send size={16} />메시지 발송이 완료되었습니다.
        </div>
      )}

      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "오늘 발송", value: "24건", color: "text-blue-600", bg: "bg-blue-50" },
            { label: "발송 성공", value: "22건", color: "text-green-600", bg: "bg-green-50" },
            { label: "노쇼 (이번달)", value: "8건", color: "text-red-500", bg: "bg-red-50" },
            { label: "취소율", value: "7.2%", color: "text-orange-500", bg: "bg-orange-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template selector */}
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">메시지 템플릿</h2>
            {TEMPLATES.map((t) => (
              <div
                key={t.type}
                onClick={() => setSelectedTemplate(t)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedTemplate.type === t.type ? `${t.border} ${t.bg}` : "border-gray-100 bg-white hover:border-gray-200"}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.bg}`}>
                    <t.icon size={16} className={t.color} />
                  </div>
                  <span className="font-medium text-gray-900 text-sm">{t.title}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line line-clamp-2">
                  {t.content}
                </p>
              </div>
            ))}
          </div>

          {/* Template preview + send */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">템플릿 편집</h2>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <selectedTemplate.icon size={16} className={selectedTemplate.color} />
                <h3 className="font-medium text-gray-900 text-sm">{selectedTemplate.title}</h3>
              </div>
              <textarea
                defaultValue={selectedTemplate.content}
                rows={7}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-gray-700"
              />
              <p className="text-xs text-gray-400 mt-1">{"{{date}}, {{time}}, {{service}}, {{designer}} 변수 사용 가능"}</p>

              <div className="flex gap-2 mt-4">
                <select className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option>SMS</option>
                  <option>카카오 알림톡</option>
                </select>
                <button
                  onClick={handleSend}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Send size={14} />발송
                </button>
              </div>
            </div>

            {/* Reminder list */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">예약 리마인드 예정</h3>
              <div className="space-y-2">
                {MOCK_RESERVATIONS.filter(r => r.date === "2025-05-26").slice(0, 4).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.customerName}</p>
                      <p className="text-xs text-gray-500">{r.date} {r.time} · {r.serviceName}</p>
                    </div>
                    <button
                      onClick={handleSend}
                      className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50"
                    >
                      발송
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">취소 사유 분석</h2>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex justify-center mb-4">
                <PieChart width={160} height={160}>
                  <Pie data={CANCEL_REASON_DATA} dataKey="value" cx={75} cy={75} innerRadius={45} outerRadius={70}>
                    {CANCEL_REASON_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} />
                </PieChart>
              </div>
              <div className="space-y-2">
                {CANCEL_REASON_DATA.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-gray-600 text-xs">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 text-xs">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Noshow customers */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" /> 노쇼 고객
              </h3>
              {noshowRes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">노쇼 고객이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {noshowRes.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-1.5 bg-red-50 rounded-lg px-3">
                      <div>
                        <p className="text-sm font-medium text-red-900">{r.customerName}</p>
                        <p className="text-xs text-red-600">{r.date} · {r.serviceName}</p>
                      </div>
                      <button
                        onClick={handleSend}
                        className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-100"
                      >
                        안내 발송
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Send log + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Log table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">발송 이력</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["유형", "고객", "채널", "발송시각", "상태"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_MESSAGE_LOGS.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        log.type === "reservation_confirm" ? "bg-green-100 text-green-700" :
                        log.type === "reminder" ? "bg-blue-100 text-blue-700" :
                        log.type === "cancel" ? "bg-orange-100 text-orange-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {log.type === "reservation_confirm" ? "확정" : log.type === "reminder" ? "리마인드" : log.type === "cancel" ? "취소" : "노쇼"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{log.customerName}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{log.channel}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{log.sentAt}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {log.status === "sent" ? "발송 완료" : "실패"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 30 day chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">최근 30일 알림·노쇼 통계</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={STATS_30}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="알림" fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="노쇼" fill="#f43f5e" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
