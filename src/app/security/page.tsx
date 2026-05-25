"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { MOCK_ACCESS_LOGS } from "@/data/mock";
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";

const PERMISSIONS = [
  { feature: "고객 연락처 전체 열람", 원장: true, 매니저: false, 디자이너: false },
  { feature: "예약 등록/수정", 원장: true, 매니저: true, 디자이너: true },
  { feature: "예약 취소", 원장: true, 매니저: true, 디자이너: false },
  { feature: "고객 정보 열람", 원장: true, 매니저: true, 디자이너: true },
  { feature: "고객 정보 수정", 원장: true, 매니저: true, 디자이너: false },
  { feature: "매출 조회", 원장: true, 매니저: true, 디자이너: false },
  { feature: "직원 관리", 원장: true, 매니저: false, 디자이너: false },
  { feature: "시술 메뉴 수정", 원장: true, 매니저: true, 디자이너: false },
  { feature: "메시지 발송", 원장: true, 매니저: true, 디자이너: false },
  { feature: "접근 로그 조회", 원장: true, 매니저: false, 디자이너: false },
  { feature: "보안 설정 변경", 원장: true, 매니저: false, 디자이너: false },
];

export default function SecurityPage() {
  const [maskPhone, setMaskPhone] = useState(true);
  const [logAccess, setLogAccess] = useState(true);

  return (
    <AdminLayout title="보안 및 권한 관리" description="고객 개인정보 보호와 직원별 권한을 관리하세요.">
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">뷰티링크는 고객님의 소중한 정보를 안전하게 보호합니다.</h2>
            <p className="text-sm text-white/70">연락처 마스킹, 권한 분리, 접근 로그 기록으로 개인정보를 체계적으로 관리합니다.</p>
          </div>
        </div>

        {/* Security status cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "연락처 마스킹", status: "활성화", icon: EyeOff, color: "text-green-600", bg: "bg-green-50" },
            { title: "직원 권한 관리", status: "설정 완료", icon: Shield, color: "text-blue-600", bg: "bg-blue-50" },
            { title: "접근 로그", status: "기록 중", icon: Eye, color: "text-purple-600", bg: "bg-purple-50" },
            { title: "데이터 암호화", status: "적용 중", icon: Lock, color: "text-gray-600", bg: "bg-gray-100" },
          ].map(s => (
            <div key={s.title} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                <s.icon size={18} className={s.color} />
              </div>
              <p className="text-sm text-gray-500">{s.title}</p>
              <p className={`text-sm font-semibold mt-1 ${s.color}`}>{s.status}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Masking settings */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">개인정보 보호 설정</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900 text-sm">연락처 마스킹</p>
                  <p className="text-xs text-gray-500 mt-0.5">010-****-5678 형태로 표시 (원장만 전체 번호 확인)</p>
                </div>
                <button
                  onClick={() => setMaskPhone(!maskPhone)}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${maskPhone ? "bg-blue-600" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${maskPhone ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900 text-sm">접근 로그 기록</p>
                  <p className="text-xs text-gray-500 mt-0.5">고객 정보 조회 시 자동 기록</p>
                </div>
                <button
                  onClick={() => setLogAccess(!logAccess)}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${logAccess ? "bg-blue-600" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${logAccess ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div className="py-3">
                <p className="font-medium text-gray-900 text-sm mb-3">개인정보 수집 항목</p>
                <div className="space-y-2">
                  {[
                    { item: "이름 (필수)", purpose: "예약 서비스 제공" },
                    { item: "전화번호 (필수)", purpose: "예약 알림 발송" },
                    { item: "방문 이력 (선택)", purpose: "맞춤 서비스 제공" },
                    { item: "시술 메모 (선택)", purpose: "재방문 서비스 향상" },
                  ].map(({ item, purpose }) => (
                    <div key={item} className="flex items-start gap-2 text-xs">
                      <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-900">{item}</span>
                        <span className="text-gray-500"> — {purpose}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-1.5">보관·삭제 기준</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>· 예약 데이터: 예약일로부터 3년 보관</p>
                  <p>· 고객 개인정보: 마지막 방문 후 3년 보관</p>
                  <p>· 이용자 탈퇴 시: 즉시 삭제 (법적 의무 제외)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Role permission table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">역할별 권한 관리</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">기능</th>
                    {["원장", "매니저", "디자이너"].map(role => (
                      <th key={role} className="px-4 py-3 text-center text-xs font-medium text-gray-500">{role}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {PERMISSIONS.map(p => (
                    <tr key={p.feature} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-xs text-gray-700">{p.feature}</td>
                      {(["원장", "매니저", "디자이너"] as const).map(role => (
                        <td key={role} className="px-4 py-2.5 text-center">
                          {p[role] ? (
                            <CheckCircle size={16} className="text-green-500 mx-auto" />
                          ) : (
                            <span className="text-gray-200">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Access logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">접근 로그</h2>
            <span className="text-xs text-gray-400">최근 5건</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["사용자", "역할", "작업", "대상", "IP", "시각"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_ACCESS_LOGS.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{log.userName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      log.role === "원장" ? "bg-purple-100 text-purple-700" :
                      log.role === "매니저" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {log.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{log.action}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{log.target}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.ip}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Privacy policy quick view */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            {
              title: "개인정보 처리 목적",
              items: ["예약 서비스 제공", "예약 알림 및 리마인드 발송", "재방문 서비스 향상", "매출 통계 분석 (익명화)"],
              icon: Shield,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              title: "제3자 제공 기준",
              items: ["원칙적 제3자 제공 금지", "예약 플랫폼 연동 시 최소한의 정보만 제공", "법적 의무 이행 시에만 제공", "사전 동의 없이 마케팅 활용 금지"],
              icon: AlertCircle,
              color: "text-orange-500",
              bg: "bg-orange-50",
            },
            {
              title: "고객 권리 안내",
              items: ["개인정보 열람 요청 가능", "정보 수정·삭제 요청 가능", "동의 철회 가능", "불만 및 피해 구제 신청 가능"],
              icon: CheckCircle,
              color: "text-green-600",
              bg: "bg-green-50",
            },
          ].map(section => (
            <div key={section.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 ${section.bg} rounded-lg flex items-center justify-center`}>
                  <section.icon size={16} className={section.color} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{section.title}</h3>
              </div>
              <ul className="space-y-2">
                {section.items.map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
