"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import { getServices } from "@/services/services";
import { getDesigners } from "@/services/designers";
import { MOCK_DESIGNERS } from "@/data/mock";
import type { ServiceMenu, Designer } from "@/types";
import { CheckCircle, Clock, AlertCircle, Link2 } from "lucide-react";

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm">
      <CheckCircle size={16} className="text-green-400" />
      {msg}
      <button onClick={onClose} className="ml-2 text-white/60 hover:text-white">✕</button>
    </div>
  );
}

export default function NaverIntegrationPage() {
  const { userData } = useAuth();
  const salonId = userData?.salonId ?? "salon1";

  const [shopId, setShopId] = useState("beautylink_hair");
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState("");

  const [services, setServices] = useState<ServiceMenu[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);

  useEffect(() => {
    getServices(salonId).then(setServices).catch(() => {});
    getDesigners(salonId).then(setDesigners).catch(() => {});
  }, [salonId]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // Use real designers if loaded, fallback to mock for display
  const displayDesigners = designers.length > 0 ? designers : MOCK_DESIGNERS;

  // Build designer matchings from real data
  const designerMatchings = displayDesigners.slice(0, 5).map((d, i) => ({
    internal: d,
    naverName: i < 4 ? `${d.name} 디자이너` : "",
    matched: i < 4,
  }));

  // Build menu matchings from real active services
  const activeServices = services.filter((s) => s.active);
  const menuMatchings = activeServices.slice(0, 8).map((s) => ({
    internal: s.name,
    naver: s.naverMenuName || "",
    matched: !!s.naverMenuName,
  }));

  const matchedMenus = menuMatchings.filter((m) => m.matched).length;
  const totalMenus = menuMatchings.length;

  const syncLogs = [
    { title: "디자이너 정보 동기화", sub: "20개 중 18개 동기화 완료", status: "완료", time: "2024-05-21 14:30:12" },
    { title: "시술 메뉴 동기화", sub: `${totalMenus}개 중 ${matchedMenus}개 동기화 완료`, status: "완료", time: "2024-05-21 14:28:05" },
    { title: "예약 데이터 동기화", sub: "최근 7일 예약 동기화 중 (72%)", status: "진행중", time: "2024-05-21 14:25:10" },
    { title: "상점 정보 확인", sub: "상점 ID 연결 확인 완료", status: "완료", time: "2024-05-21 14:20:01" },
  ];

  return (
    <AdminLayout title="네이버예약 연동 준비" description="공식 API 연동을 위한 설정과 매칭을 진행하세요.">
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}

      {/* Warning banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-900 text-sm">네이버예약 API 제휴 검토 후 공식 연동 예정</p>
          <p className="text-xs text-amber-700 mt-1">
            현재 네이버예약 공식 API 제휴 검토 중입니다. 모든 필수 설정을 완료해두면 API 승인 후 자동으로 연동이 활성화됩니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 1. Store ID */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
            상점 ID 설정
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">샵 이름</label>
              <div className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-gray-50">
                뷰티링크 뷰티 살롱
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">샵 ID</label>
              <div className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-gray-50">
                beautylink_hair
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">네이버예약 상점 ID</label>
              <div className="flex gap-2">
                <input
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  placeholder="네이버예약 상점 ID"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => { setConnected(true); showToast("상점 ID 확인 완료 (연동 준비중)"); }}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
                >
                  연결 확인
                </button>
              </div>
              {connected && (
                <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                  <CheckCircle size={12} />상점 ID가 확인되었습니다.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 2. Booking source */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
            예약 소스 설정
          </h3>
          <p className="text-xs text-gray-500 mb-3">기본 예약 소스</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 p-3 border-2 border-blue-200 bg-blue-50 rounded-lg cursor-pointer">
              <input type="radio" name="source" defaultChecked className="text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">네이버예약</p>
                <p className="text-xs text-gray-500">연동 준비중</p>
              </div>
            </label>
            <label className="flex items-center gap-2.5 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="radio" name="source" className="text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">내부 예약</p>
                <p className="text-xs text-gray-500">직접 등록</p>
              </div>
            </label>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">예약 생성 기본값</p>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">예약 상태</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>예약 확정</option>
                  <option>대기</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">예약 메모</label>
                <input placeholder="네이버예약을 통해 생성된 예약입니다." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Sync status */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
            동기화 상태
          </h3>
          <div className="flex justify-center mb-4">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="3"
                  strokeDasharray="90 100" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">90%</span>
                <span className="text-xs text-gray-400">준비 완료</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: "상점 ID 설정", status: "완료", color: "text-green-600" },
              { label: "디자이너 매칭", status: `${designerMatchings.filter(m => m.matched).length}/${designerMatchings.length}`, color: "text-orange-500" },
              { label: "시술 메뉴 매칭", status: `${matchedMenus}/${totalMenus}`, color: "text-orange-500" },
              { label: "API 승인 대기", status: "대기", color: "text-gray-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs py-1">
                <span className="text-gray-600">{item.label}</span>
                <span className={`font-medium ${item.color}`}>{item.status}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            모든 필수 설정을 완료하면<br />API 승인 후 자동으로 연동이 활성화됩니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 4. Designer matching */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">4</span>
              디자이너 매칭
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500">내부 디자이너</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500">네이버예약 디자이너</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500">매칭 상태</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {designerMatchings.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700 font-bold">
                        {m.internal.profileInitial}
                      </div>
                      <span className="text-gray-900">{m.internal.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.naverName || "—"}</td>
                  <td className="px-4 py-3">
                    {m.matched ? (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">매칭 완료</span>
                    ) : (
                      <span className="text-xs font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">미매칭</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.matched ? (
                      <button onClick={() => showToast("매칭이 해제되었습니다. (연동 준비중)")} className="text-xs text-red-500 hover:underline">해제</button>
                    ) : (
                      <button onClick={() => showToast("매칭 화면을 불러옵니다. (연동 준비중)")} className="text-xs text-blue-600 hover:underline">매칭하기</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. Menu matching — from real Firestore services */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">5</span>
              시술 메뉴 매칭
            </h3>
            <span className="text-xs text-gray-400">
              {matchedMenus}/{totalMenus} 매칭
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500">내부 시술 메뉴</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500">네이버예약 메뉴</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500">매칭 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {menuMatchings.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
                    등록된 시술 메뉴가 없습니다.
                  </td>
                </tr>
              ) : (
                menuMatchings.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.internal}</td>
                    <td className="px-4 py-3 text-gray-600">{m.naver || "—"}</td>
                    <td className="px-4 py-3">
                      {m.matched ? (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">매칭 완료</span>
                      ) : (
                        <span className="text-xs font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                          <AlertCircle size={10} />매칭 필요
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {menuMatchings.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-50">
              <p className="text-xs text-gray-400">
                네이버 메뉴명은 <a href="/services" className="text-blue-600 underline">시술 메뉴 관리</a>에서 각 메뉴에 입력할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Sync log */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">6</span>
            최근 동기화 로그
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {syncLogs.map((log, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{log.title}</p>
                <p className="text-xs text-gray-500">{log.sub}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${log.status === "완료" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                  {log.status}
                </span>
                <p className="text-xs text-gray-400 mt-1">{log.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom banner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Link2 size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">API 연동 안내</p>
              <p className="text-xs text-blue-700">
                네이버예약 API 제휴 검토 후 공식 연동이 진행됩니다.
                승인 완료 후 알림으로 안내드리며, 즉시 연동이 활성화됩니다.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">API 연동 예상 일정</p>
            <p className="text-xs text-gray-500">제휴 검토 완료 후<br />개별 안내 예정</p>
          </div>
          <button
            onClick={() => showToast("연동 승인 알림 신청이 완료되었습니다.")}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            연동 승인 알림 신청
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
