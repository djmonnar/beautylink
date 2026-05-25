"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import StatCard from "@/components/ui/StatCard";
import {
  CalendarDays,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  HOURLY_CHART_DATA,
  SOURCE_CHART_DATA,
  sourceLabel,
  sourceColor,
  statusLabel,
  statusColor,
  resetDemoData,
} from "@/data/mock";
import { useAuth } from "@/context/AuthContext";
import { getReservations } from "@/services/reservations";
import { getDesigners } from "@/services/designers";
import type { Reservation, Designer } from "@/types";

// 시드 데이터가 담긴 데모 날짜
const DEMO_DATE = "2025-05-25";

export default function DashboardPage() {
  const { userData } = useAuth();
  const salonId = userData?.salonId ?? "salon1";

  const [todayRes, setTodayRes] = useState<Reservation[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);

  useEffect(() => {
    getReservations(salonId, DEMO_DATE).then(setTodayRes);
    getDesigners(salonId).then(setDesigners);
  }, [salonId]);

  const todayRevenue = todayRes
    .filter((r) => r.status !== "noshow" && r.status !== "cancelled")
    .reduce((s, r) => s + r.price, 0);

  const noshowCount = todayRes.filter((r) => r.status === "noshow").length;

  function handleReset() {
    resetDemoData();
    alert("데모 데이터가 초기화되었습니다. 페이지를 새로고침 해주세요.");
    window.location.reload();
  }

  return (
    <AdminLayout title="대시보드" description="오늘의 매장 현황을 확인하세요.">
      <div className="space-y-6">
        {/* Reset button */}
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={12} />
            데모 데이터 초기화
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="오늘 예약"
            value={`${todayRes.length}건`}
            icon={CalendarDays}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
            trend="전일 대비 +12%"
            trendUp
          />
          <StatCard
            title="신규 고객"
            value="8명"
            icon={Users}
            iconColor="text-green-600"
            iconBg="bg-green-50"
            trend="전일 대비 +8%"
            trendUp
          />
          <StatCard
            title="예상 매출"
            value={`${todayRevenue.toLocaleString()}원`}
            icon={TrendingUp}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
            trend="전일 대비 +15%"
            trendUp
          />
          <StatCard
            title="노쇼 건수"
            value={`${noshowCount}건`}
            icon={AlertTriangle}
            iconColor="text-red-500"
            iconBg="bg-red-50"
            trend="전일 대비 -33%"
            trendUp={false}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hourly chart */}
          <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">시간대별 예약 현황</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={HOURLY_CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="예약수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">예약 출처 비율</h2>
            <div className="flex justify-center mb-4">
              <PieChart width={160} height={160}>
                <Pie data={SOURCE_CHART_DATA} dataKey="value" cx={75} cy={75} innerRadius={45} outerRadius={70}>
                  {SOURCE_CHART_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </div>
            <div className="space-y-2">
              {SOURCE_CHART_DATA.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent reservations */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">오늘 예약 목록</h2>
              <a href="/calendar" className="text-sm text-blue-600 hover:underline">전체 보기 →</a>
            </div>
            <div className="overflow-x-auto">
              {todayRes.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">예약 데이터가 없습니다.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["시간", "고객명", "시술", "디자이너", "출처", "상태"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {todayRes.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{r.time}</td>
                        <td className="px-4 py-3 text-gray-800">{r.customerName}</td>
                        <td className="px-4 py-3 text-gray-600">{r.serviceName}</td>
                        <td className="px-4 py-3 text-gray-600">{r.designerName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sourceColor(r.source)}`}>
                            {sourceLabel(r.source)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                            {statusLabel(r.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Designer summary */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">디자이너별 오늘 예약</h2>
            <div className="space-y-4">
              {designers.map((d) => {
                const cnt = todayRes.filter((r) => r.designerId === d.id).length;
                return (
                  <div key={d.id} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: d.color }}
                    >
                      {d.profileInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{d.name}</span>
                        <span className="text-sm font-bold text-blue-600">{cnt}건</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${(cnt / 10) * 100}%`, background: d.color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-900">오늘 운영 요약</span>
              </div>
              <div className="space-y-1 text-xs text-blue-800">
                <p>· 취소: {todayRes.filter((r) => r.status === "cancelled").length}건 / 노쇼: {noshowCount}건</p>
                <p>· 가장 바쁜 시간대: 13시</p>
                <p>· 완료 예약: {todayRes.filter((r) => r.status === "completed").length}건</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
