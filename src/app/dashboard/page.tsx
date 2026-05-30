"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import StatCard from "@/components/ui/StatCard";
import {
  CalendarDays,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { sourceLabel, sourceColor, statusLabel, statusColor } from "@/types";
import type { ReservationSource } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getReservations, getReservationsByDateRange } from "@/services/reservations";
import { getDesigners } from "@/services/designers";
import { getCustomers } from "@/services/customers";
import type { Reservation, Designer } from "@/types";

// ── 기간 타입 ─────────────────────────────────────────────────────────────
type Period = "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  today: "오늘",
  week: "최근 7일",
  month: "최근 30일",
};

// ── 출처별 색상 ───────────────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  naver: "#10b981",
  phone: "#3b82f6",
  visit: "#f43f5e",
  kakao: "#a855f7",
};

// ── 데모 모드 기준 날짜 (db 없을 때 사용) ──────────────────────────────────
const DEMO_DATE = "2025-05-25";

// ── 날짜 헬퍼 ─────────────────────────────────────────────────────────────
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getPeriodDates(
  period: Period,
  todayStr: string
): { startDate: string; endDate: string } {
  if (period === "today") return { startDate: todayStr, endDate: todayStr };
  const days = period === "week" ? 6 : 29;
  const start = new Date(todayStr + "T00:00:00");
  start.setDate(start.getDate() - days);
  return { startDate: localDateStr(start), endDate: todayStr };
}

// ── 차트 집계 헬퍼 ────────────────────────────────────────────────────────
function buildHourlyData(reservations: Reservation[]) {
  // 08시 ~ 20시 (13개 슬롯)
  const hours = Array.from({ length: 13 }, (_, i) => ({
    hour: `${i + 8}시`,
    예약수: 0,
  }));
  for (const r of reservations) {
    const h = parseInt(r.time.split(":")[0], 10);
    const idx = h - 8;
    if (idx >= 0 && idx < hours.length) hours[idx].예약수++;
  }
  return hours;
}

function buildDailyData(
  reservations: Reservation[],
  startDate: string,
  endDate: string
) {
  const result: { label: string; date: string; 예약수: number }[] = [];
  const d = new Date(startDate + "T00:00:00");
  while (localDateStr(d) <= endDate) {
    result.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      date: localDateStr(d),
      예약수: 0,
    });
    d.setDate(d.getDate() + 1);
  }
  for (const r of reservations) {
    const item = result.find((x) => x.date === r.date);
    if (item) item.예약수++;
  }
  return result;
}

function buildSourceData(reservations: Reservation[]) {
  const counts = new Map<string, number>();
  for (const r of reservations) {
    counts.set(r.source, (counts.get(r.source) ?? 0) + 1);
  }
  const total = Math.max(reservations.length, 1);
  return Array.from(counts.entries())
    .map(([src, cnt]) => ({
      src,
      name: sourceLabel(src as ReservationSource) ?? src,
      rawCount: cnt,
      value: Math.round((cnt / total) * 100),
      color: SOURCE_COLORS[src] ?? "#9ca3af",
    }))
    .sort((a, b) => b.rawCount - a.rawCount);
}

function getBusiestHour(reservations: Reservation[]): string {
  const counts: Record<number, number> = {};
  for (const r of reservations) {
    const h = parseInt(r.time.split(":")[0], 10);
    if (!isNaN(h)) counts[h] = (counts[h] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  if (!entries.length) return "—";
  const [h] = entries.sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  return `${h}시`;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { userData } = useAuth();
  const salonId = userData?.salonId ?? null;

  // 데모 모드 여부 (db === null이면 데모)
  const isDemo = !db;
  const todayStr = isDemo ? DEMO_DATE : localDateStr(new Date());

  const [period, setPeriod] = useState<Period>("today");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [newCustCount, setNewCustCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!salonId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getPeriodDates(period, todayStr);

      const [res, des, custs] = await Promise.all([
        // 오늘은 단일 where("date","=="), 기간은 range 쿼리
        startDate === endDate
          ? getReservations(salonId, startDate)
          : getReservationsByDateRange(salonId, startDate, endDate),
        getDesigners(salonId),
        // 신규 고객 집계는 "오늘" 기간만 (전체 컬렉션 조회 최소화)
        period === "today" ? getCustomers(salonId) : Promise.resolve([]),
      ]);

      setReservations(res);
      setDesigners(des.filter((d) => d.status !== "inactive"));

      if (period === "today") {
        setNewCustCount(
          custs.filter((c) => (c.registeredAt ?? "").startsWith(todayStr)).length
        );
      } else {
        setNewCustCount(null);
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "데이터를 불러오는데 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [salonId, period, todayStr]);

  useEffect(() => {
    load();
  }, [load]);

  // ── 집계 ─────────────────────────────────────────────────────────────────
  const completedRes = reservations.filter((r) => r.status === "completed");
  const pendingRes = reservations.filter((r) => r.status === "pending");
  const confirmedRes = reservations.filter((r) => r.status === "confirmed");
  const noShowCount = reservations.filter((r) => r.status === "noShow").length;
  const cancelledCount = reservations.filter((r) => r.status === "cancelled").length;
  const completedRevenue = completedRes.reduce((s, r) => s + r.price, 0);
  const expectedRevenue = reservations
    .filter((r) => ["confirmed", "pending", "completed"].includes(r.status))
    .reduce((s, r) => s + r.price, 0);

  // ── 차트 데이터 ──────────────────────────────────────────────────────────
  const { startDate, endDate } = getPeriodDates(period, todayStr);
  const chartData =
    period === "today"
      ? buildHourlyData(reservations)
      : buildDailyData(reservations, startDate, endDate);
  const xKey = period === "today" ? "hour" : "label";
  const sourceData = buildSourceData(reservations);
  const busiestHour = getBusiestHour(reservations);

  // 최근 예약 목록 (날짜+시간 내림차순, 최대 20건)
  const recentRes = [...reservations]
    .sort((a, b) => {
      const dc = (b.date ?? "").localeCompare(a.date ?? "");
      return dc !== 0 ? dc : (b.time ?? "").localeCompare(a.time ?? "");
    })
    .slice(0, 20);

  // 디자이너 진행바 최대값 기준
  const maxDesignerCount = Math.max(
    ...designers.map((d) => reservations.filter((r) => r.designerId === d.id).length),
    1
  );

  // ── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout
      title="대시보드"
      description={`${PERIOD_LABELS[period]} 매장 현황${isDemo ? " (데모 모드)" : ""}`}
    >
      <div className="space-y-6">
        {/* 상단: 기간 탭 + 새로고침 */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2">
            {(["today", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>

        {/* salonId null 가드 */}
        {!salonId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
            <p className="text-amber-800 font-semibold mb-1">
              매장 정보가 연결되지 않았습니다.
            </p>
            <p className="text-sm text-amber-600">
              users/{userData?.uid ?? "—"}.salonId를 확인해주세요.
            </p>
          </div>
        ) : error ? (
          /* 에러 */
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">
            <p className="font-semibold mb-1">데이터 로드 오류</p>
            <p className="text-red-600 break-all">{error}</p>
            <button onClick={load} className="mt-3 text-xs underline">
              다시 시도
            </button>
          </div>
        ) : loading ? (
          /* 로딩 */
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-400" />
          </div>
        ) : (
          <>
            {/* ── 통계 카드 ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title={`${PERIOD_LABELS[period]} 예약`}
                value={`${reservations.length}건`}
                icon={CalendarDays}
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
                trend={`완료 ${completedRes.length}건 포함`}
                trendUp
              />
              <StatCard
                title="완료 매출"
                value={`${completedRevenue.toLocaleString()}원`}
                icon={TrendingUp}
                iconColor="text-purple-600"
                iconBg="bg-purple-50"
                trend={`예상 누계 ${expectedRevenue.toLocaleString()}원`}
                trendUp
              />
              <StatCard
                title="노쇼·취소"
                value={`${noShowCount + cancelledCount}건`}
                icon={AlertTriangle}
                iconColor="text-red-500"
                iconBg="bg-red-50"
                trend={`노쇼 ${noShowCount}건 / 취소 ${cancelledCount}건`}
                trendUp={false}
              />
              {period === "today" ? (
                <StatCard
                  title="신규 고객"
                  value={`${newCustCount ?? 0}명`}
                  icon={Users}
                  iconColor="text-green-600"
                  iconBg="bg-green-50"
                  trend="오늘 신규 등록"
                  trendUp
                />
              ) : (
                <StatCard
                  title="완료 예약"
                  value={`${completedRes.length}건`}
                  icon={Users}
                  iconColor="text-green-600"
                  iconBg="bg-green-50"
                  trend={`확정+대기 ${confirmedRes.length + pendingRes.length}건 남음`}
                  trendUp
                />
              )}
            </div>

            {/* ── 차트 영역 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar 차트 */}
              <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100 min-w-0">
                <h2 className="font-semibold text-gray-900 mb-4">
                  {period === "today" ? "시간대별 예약 현황" : "일별 예약 현황"}
                </h2>
                {reservations.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
                    예약 데이터가 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[280px]">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="예약수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* Pie 차트 */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-4">예약 출처 비율</h2>
                {sourceData.length === 0 ? (
                  <div className="h-[160px] flex items-center justify-center text-sm text-gray-400">
                    데이터 없음
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center mb-4">
                      <PieChart width={160} height={160}>
                        <Pie
                          data={sourceData}
                          dataKey="value"
                          cx={75}
                          cy={75}
                          innerRadius={45}
                          outerRadius={70}
                        >
                          {sourceData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `${v}%`} />
                      </PieChart>
                    </div>
                    <div className="space-y-2">
                      {sourceData.map((item) => (
                        <div
                          key={item.src}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ background: item.color }}
                            />
                            <span className="text-gray-600">{item.name}</span>
                          </div>
                          <span className="font-semibold text-gray-900">
                            {item.value}%{" "}
                            <span className="text-gray-400 font-normal">
                              ({item.rawCount}건)
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── 예약 목록 + 디자이너 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 예약 목록 */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">
                    {period === "today" ? "오늘 예약 목록" : "최근 예약 목록"}
                    {recentRes.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        ({recentRes.length}건)
                      </span>
                    )}
                  </h2>
                  <a href="/calendar" className="text-sm text-blue-600 hover:underline">
                    전체 보기 →
                  </a>
                </div>

                {recentRes.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    예약 데이터가 없습니다.
                  </div>
                ) : (
                  <>
                    {/* 모바일 카드 뷰 */}
                    <div className="md:hidden divide-y divide-gray-50">
                      {recentRes.map((r) => (
                        <div
                          key={r.id}
                          className="px-4 py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex gap-3 min-w-0">
                            <div className="flex-shrink-0 text-right">
                              <p className="text-sm font-bold text-gray-900 tabular-nums">
                                {r.time}
                              </p>
                              {period !== "today" && (
                                <p className="text-[10px] text-gray-400">
                                  {r.date.slice(5)}
                                </p>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {r.customerName}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {r.serviceName} · {r.designerName}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sourceColor(
                                r.source
                              )}`}
                            >
                              {sourceLabel(r.source)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor(
                                r.status
                              )}`}
                            >
                              {statusLabel(r.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 데스크탑 테이블 */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {[
                              ...(period !== "today" ? ["날짜"] : []),
                              "시간",
                              "고객명",
                              "시술",
                              "디자이너",
                              "출처",
                              "상태",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {recentRes.map((r) => (
                            <tr
                              key={r.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              {period !== "today" && (
                                <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">
                                  {r.date.slice(5)}
                                </td>
                              )}
                              <td className="px-4 py-3 font-medium text-gray-900 tabular-nums">
                                {r.time}
                              </td>
                              <td className="px-4 py-3 text-gray-800">{r.customerName}</td>
                              <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">
                                {r.serviceName}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{r.designerName}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${sourceColor(
                                    r.source
                                  )}`}
                                >
                                  {sourceLabel(r.source)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(
                                    r.status
                                  )}`}
                                >
                                  {statusLabel(r.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* 디자이너별 예약 요약 */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-4">디자이너별 예약</h2>

                {designers.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">디자이너 데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {designers.map((d) => {
                      const cnt = reservations.filter(
                        (r) => r.designerId === d.id
                      ).length;
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
                              <span className="text-sm font-medium text-gray-900">
                                {d.name}
                              </span>
                              <span className="text-sm font-bold text-blue-600">
                                {cnt}건
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${(cnt / maxDesignerCount) * 100}%`,
                                  background: d.color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 운영 요약 카드 */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      {PERIOD_LABELS[period]} 운영 요약
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-blue-800">
                    <p>
                      · 완료: {completedRes.length}건 / 대기:{" "}
                      {pendingRes.length}건
                    </p>
                    <p>
                      · 노쇼: {noShowCount}건 / 취소: {cancelledCount}건
                    </p>
                    {period === "today" && (
                      <p>· 가장 바쁜 시간대: {busiestHour}</p>
                    )}
                    {newCustCount !== null && (
                      <p>· 신규 고객: {newCustCount}명</p>
                    )}
                    {isDemo && (
                      <p className="pt-1 text-blue-600 opacity-70">
                        ※ 데모 모드: {DEMO_DATE} 기준
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
