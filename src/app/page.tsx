"use client";

import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  CalendarPlus,
  Users,
  Scissors,
  MessageSquare,
  Shield,
  CheckCircle,
  AlertCircle,
  Link2,
  ChevronRight,
  Clock,
  TrendingUp,
  Lock,
  MenuIcon,
  BarChart3,
  PhoneOff,
  NotebookPen,
  CalendarX,
  UserX,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/logo-horizontal.png" alt="뷰티링크" width={148} height={38} priority className="object-contain" />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#problems" className="hover:text-gray-900">불편함</a>
            <a href="#features" className="hover:text-gray-900">기능</a>
            <a href="#integration" className="hover:text-gray-900">연동 준비</a>
            <a href="#demo-accounts" className="hover:text-gray-900">데모 계정</a>
          </nav>
          <Link
            href="/login"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            데모 시작하기
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-16 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
                <Shield size={14} className="text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">
                  네이버예약 API 제휴 검토 후 공식 연동 예정
                </span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
                미용실 예약·고객·디자이너<br />
                관리를{" "}
                <span className="text-blue-600">한 화면에서</span>
              </h1>

              <p className="text-lg text-gray-600 mb-8 max-w-xl">
                네이버예약, 전화예약, 방문예약까지 통합 관리하는 뷰티샵 전용 CRM.
                디자이너별 캘린더, 고객 방문 이력, 노쇼 관리까지 한 곳에서.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  href="/login"
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  데모 시작하기
                  <ChevronRight size={18} />
                </Link>
                <a
                  href="#features"
                  className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center"
                >
                  기능 살펴보기
                </a>
              </div>

              <div className="mt-8 flex items-center gap-4 justify-center lg:justify-start text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>무료 데모</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>설치 불필요</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>한국어 UI</span>
                </div>
              </div>
            </div>

            {/* Right - Dashboard preview */}
            <div className="flex-1 w-full max-w-xl">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="bg-[#1e2a4a] px-4 py-3 flex items-center">
                  <Image src="/logo-sidebar-dark.png" alt="뷰티링크" width={90} height={22} className="object-contain" />
                </div>
                <div className="p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "오늘 예약", value: "12건", color: "text-blue-600" },
                      { label: "신규 고객", value: "3명", color: "text-green-600" },
                      { label: "오늘 매출", value: "480,000원", color: "text-purple-600" },
                      { label: "노쇼 건수", value: "1건", color: "text-red-600" },
                    ].map((item) => (
                      <div key={item.label} className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs font-medium text-gray-700 mb-2">오늘 예약 목록</p>
                    {[
                      { time: "10:00", name: "김미진", service: "커트+클리닉", src: "네이버", color: "bg-green-100 text-green-700" },
                      { time: "11:30", name: "이수빈", service: "염색·펌", src: "전화", color: "bg-blue-100 text-blue-700" },
                      { time: "13:00", name: "박서연", service: "볼륨매직", src: "방문", color: "bg-rose-100 text-rose-700" },
                    ].map((r) => (
                      <div key={r.time + r.name} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-xs text-gray-400 w-10">{r.time}</span>
                        <span className="text-xs font-medium text-gray-800 flex-1">{r.name}</span>
                        <span className="text-xs text-gray-500 flex-1">{r.service}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.color}`}>{r.src}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem section */}
      <section id="problems" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">이런 어려움, 겪고 계신가요?</h2>
            <p className="text-gray-600">미용실·뷰티샵 운영의 가장 흔한 불편함들을 모아봤습니다.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Link2,
                color: "text-blue-500",
                bg: "bg-blue-50",
                title: "네이버예약 따로",
                desc: "네이버예약은 앱에서, 전화예약은 메모장에, 방문예약은 수기로 — 통합이 안 됩니다.",
              },
              {
                icon: NotebookPen,
                color: "text-orange-500",
                bg: "bg-orange-50",
                title: "전화예약 메모 따로",
                desc: "공책이나 카카오톡으로 받은 예약이 흩어져 있어 빠뜨리거나 중복 잡기 쉽습니다.",
              },
              {
                icon: CalendarX,
                color: "text-red-500",
                bg: "bg-red-50",
                title: "디자이너 스케줄 따로",
                desc: "누가 언제 쉬는지, 어떤 시간에 예약이 가능한지 한눈에 파악하기 어렵습니다.",
              },
              {
                icon: Users,
                color: "text-purple-500",
                bg: "bg-purple-50",
                title: "고객 이력 관리 어려움",
                desc: "재방문 고객의 선호 스타일, 시술 이력, 특이사항을 기억하기 힘듭니다.",
              },
              {
                icon: UserX,
                color: "text-rose-500",
                bg: "bg-rose-50",
                title: "노쇼 관리 어려움",
                desc: "노쇼 고객 기록도 없고, 리마인드 문자 보내는 것도 매번 수작업입니다.",
              },
              {
                icon: TrendingUp,
                color: "text-green-500",
                bg: "bg-green-50",
                title: "매출 파악 어려움",
                desc: "오늘 얼마 벌었는지, 어떤 시술이 잘 나가는지 숫자로 보기가 힘듭니다.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${item.bg}`}>
                  <item.icon size={20} className={item.color} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - 4 big alternating */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">뷰티링크의 해결책</h2>
            <p className="text-gray-600">미용실 운영에 필요한 모든 기능을 한 곳에서</p>
          </div>

          {/* Big feature blocks */}
          <div className="space-y-16 mb-20">
            {[
              {
                icon: CalendarDays,
                color: "bg-blue-600",
                badge: "예약 관리",
                title: "예약 통합 캘린더 (일/주/월)",
                desc: "네이버예약·전화예약·방문예약을 한 캘린더에서 관리하세요. 일간·주간·월간 뷰 전환으로 스케줄을 한눈에 파악하고 중복 예약을 방지할 수 있습니다.",
                points: ["일/주/월 3가지 뷰 전환", "디자이너별 시간표", "예약 출처 색상 구분", "중복 예약 감지"],
                href: "/calendar",
              },
              {
                icon: Users,
                color: "bg-purple-600",
                badge: "고객 CRM",
                title: "고객관리 CRM",
                desc: "고객의 방문 이력, 선호 디자이너, 시술 내역, 메모까지 한 곳에 기록해 고객 데이터를 자산으로 만듭니다.",
                points: ["방문 이력 타임라인", "시술 메모 저장", "노쇼 횟수 자동 집계", "연락처 마스킹 처리"],
                href: "/customers",
              },
              {
                icon: Scissors,
                color: "bg-green-600",
                badge: "운영 관리",
                title: "디자이너 & 시술 메뉴 관리",
                desc: "디자이너별 근무시간·휴무일을 설정하고, 시술 메뉴의 가격·소요시간을 정리하세요. 예약 등록 시 자동으로 반영됩니다.",
                points: ["근무시간·휴무일 설정", "월간 달력 클릭 휴무 지정", "시술 메뉴 가격·시간 관리", "카테고리별 분류"],
                href: "/designers",
              },
              {
                icon: MessageSquare,
                color: "bg-orange-500",
                badge: "알림 관리",
                title: "문자·알림톡·노쇼 관리",
                desc: "예약 확정·리마인드·취소 알림 템플릿을 준비하고, 노쇼 고객을 체계적으로 관리하세요. (실 발송은 SMS/알림톡 API 계약 후 활성화)",
                points: ["5가지 메시지 템플릿 관리", "노쇼 고객 자동 집계", "취소 사유 분석", "발송 이력 조회"],
                href: "/messages",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className={`flex flex-col ${i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12`}
              >
                <div className="flex-1">
                  <div className={`inline-flex w-12 h-12 rounded-xl items-center justify-center mb-4 ${feature.color}`}>
                    <feature.icon size={24} className="text-white" />
                  </div>
                  <div className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded mb-3">
                    {feature.badge}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-6">{feature.desc}</p>
                  <ul className="space-y-2 mb-6">
                    {feature.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={feature.href}
                    className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700 text-sm"
                  >
                    데모에서 확인하기 <ChevronRight size={16} />
                  </Link>
                </div>
                <div className="flex-1 w-full max-w-md">
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${feature.color}`}>
                        <feature.icon size={16} className="text-white" />
                      </div>
                      <span className="font-semibold text-gray-900">{feature.title}</span>
                    </div>
                    <div className="space-y-2">
                      {feature.points.map((p) => (
                        <div key={p} className="bg-white rounded-lg px-4 py-2 text-sm text-gray-700 shadow-sm border border-gray-100">
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional features grid */}
          <div className="text-center mb-10">
            <h3 className="text-xl font-bold text-gray-900 mb-2">그 외 핵심 기능</h3>
            <p className="text-gray-500 text-sm">뷰티링크에는 운영을 도와주는 기능이 더 있습니다</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: CalendarPlus,
                color: "bg-indigo-100 text-indigo-600",
                title: "예약 등록",
                desc: "고객·디자이너·시술 선택 + 중복 감지로 빠르게 예약 등록",
                href: "/reservations/new",
              },
              {
                icon: BarChart3,
                color: "bg-teal-100 text-teal-600",
                title: "대시보드 통계",
                desc: "오늘 예약·신규 고객·매출·노쇼를 한눈에 파악",
                href: "/dashboard",
              },
              {
                icon: Shield,
                color: "bg-gray-100 text-gray-600",
                title: "보안 및 권한 관리",
                desc: "원장·매니저·디자이너 역할 분리, 접근 로그 기록",
                href: "/security",
              },
              {
                icon: MenuIcon,
                color: "bg-amber-100 text-amber-600",
                title: "시술 메뉴 관리",
                desc: "카테고리·가격·소요시간 설정 + 비활성화 처리",
                href: "/services",
              },
              {
                icon: Link2,
                color: "bg-green-100 text-green-600",
                title: "네이버예약 연동 준비",
                desc: "API 승인 전 디자이너·시술 매핑을 미리 설정",
                href: "/integrations/naver",
              },
              {
                icon: Lock,
                color: "bg-rose-100 text-rose-600",
                title: "개인정보 보호",
                desc: "연락처 마스킹, 역할별 열람 범위 차별화",
                href: "/security",
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${item.color}`}>
                  <item.icon size={20} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors">{item.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Naver integration */}
      <section id="integration" className="py-20 px-4 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 mb-4">
              <Clock size={14} className="text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">네이버예약 API 제휴 검토 후 공식 연동 예정</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">네이버예약 연동을 고려한 구조</h2>
            <p className="text-gray-600">
              뷰티링크는 네이버예약 공식 API 제휴 승인 전 단계에서도<br className="hidden sm:block" />
              내부 디자이너·시술 메뉴 매핑을 미리 준비할 수 있도록 설계되었습니다.
            </p>
          </div>

          {/* 4가지 준비 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Link2, color: "bg-blue-100 text-blue-600", title: "디자이너 매핑", desc: "내부 디자이너 이름 ↔ 네이버예약 디자이너명 1:1 연결 사전 설정" },
              { icon: MenuIcon, color: "bg-purple-100 text-purple-600", title: "시술 메뉴 매핑", desc: "내부 시술 메뉴 ↔ 네이버예약 메뉴명 1:1 연결, 카테고리별 정리" },
              { icon: CalendarDays, color: "bg-green-100 text-green-600", title: "예약 데이터 통합 준비", desc: "네이버/전화/방문 예약 경로를 구분해 하나의 캘린더에 통합 준비" },
              { icon: CheckCircle, color: "bg-amber-100 text-amber-600", title: "공식 제휴 후 API 연동 확장", desc: "제휴 승인 즉시 추가 설정 없이 실시간 연동 활성화 가능한 구조" },
            ].map((card) => (
              <div key={card.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                  <card.icon size={20} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-2">{card.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* 5단계 프로세스 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            {[
              { num: "01", title: "상점 ID 설정", desc: "매장 기본 정보 입력" },
              { num: "02", title: "디자이너 매핑", desc: "내부 ↔ 네이버 연결" },
              { num: "03", title: "시술 메뉴 매핑", desc: "메뉴 1:1 연결 준비" },
              { num: "04", title: "연동 준비율 확인", desc: "항목별 체크리스트" },
              { num: "05", title: "API 승인 후 활성화", desc: "승인 즉시 자동 연동" },
            ].map((step) => (
              <div key={step.num} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto mb-2">
                  {step.num}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
            <p className="text-sm text-amber-800">
              <strong>현재 버전은 실제 네이버예약 API를 호출하지 않습니다.</strong><br />
              네이버 공식 제휴 승인 후 별도 설정 없이 연동이 활성화됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* Demo accounts */}
      <section id="demo-accounts" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">데모 계정 안내</h2>
            <p className="text-gray-600">역할별로 다른 화면과 권한을 직접 체험해보세요.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {[
              {
                role: "원장 (Owner)",
                badge: "모든 권한",
                badgeColor: "bg-blue-100 text-blue-700",
                icon: "👑",
                desc: "매장 설정, 직원 권한 관리, 모든 고객 정보(연락처 포함), 통계·보안·QA 접근",
                available: true,
              },
              {
                role: "매니저 (Manager)",
                badge: "관리 권한",
                badgeColor: "bg-green-100 text-green-700",
                icon: "🗂️",
                desc: "예약·고객·디자이너·시술 관리. 매장 설정 변경 불가. 고객 연락처 확인 가능.",
                available: true,
              },
              {
                role: "디자이너 (Designer)",
                badge: "준비중",
                badgeColor: "bg-gray-100 text-gray-500",
                icon: "✂️",
                desc: "본인 예약 확인, 고객 연락처 마스킹. 편집 권한 없음. 추후 계정 추가 예정.",
                available: false,
              },
            ].map((account) => (
              <div
                key={account.role}
                className={`rounded-xl p-6 border ${account.available ? "border-gray-200 bg-white shadow-sm" : "border-gray-100 bg-gray-50"}`}
              >
                <div className="text-3xl mb-3">{account.icon}</div>
                <div className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-3 ${account.badgeColor}`}>
                  {account.badge}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{account.role}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{account.desc}</p>
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 space-y-1">
                  <p>이메일: <span className="text-gray-600">별도 전달</span></p>
                  <p>비밀번호: <span className="text-gray-600">별도 전달</span></p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              로그인 화면으로 이동
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1">
              <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mb-4">
                <Lock size={24} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                고객 정보를<br />안전하게 보호합니다
              </h2>
              <p className="text-gray-600 mb-8">
                뷰티링크는 고객님의 소중한 정보를 안전하게 보호합니다.
                연락처 마스킹부터 직원별 권한 분리, 접근 로그까지 체계적인 보안 시스템을 갖추고 있습니다.
              </p>
              <div className="space-y-4">
                {[
                  { title: "연락처 마스킹", desc: "010-****-5678 형태로 표시, 원장만 전체 번호 확인 가능" },
                  { title: "직원별 권한 분리", desc: "원장·매니저·디자이너별 열람 가능 정보 차별화" },
                  { title: "접근 로그 기록", desc: "누가 언제 어떤 고객 정보를 조회했는지 Firestore에 기록" },
                  { title: "개인정보 보관 정책", desc: "법적 기준에 맞는 데이터 보관 및 삭제 정책 제공" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full max-w-md">
              <div className="bg-gray-900 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-6">
                  <Shield size={20} className="text-green-400" />
                  <span className="font-semibold">보안 현황</span>
                </div>
                {[
                  { label: "연락처 마스킹", status: "활성화" },
                  { label: "직원 권한 관리", status: "설정 완료" },
                  { label: "접근 로그", status: "기록 중" },
                  { label: "Firestore 보안 규칙", status: "적용 중" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                    <span className="text-sm text-white/80">{item.label}</span>
                    <span className="text-sm font-medium text-green-400">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            뷰티샵 운영을 더 쉽게 관리해보세요
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            실제 서비스와 동일한 화면으로 모든 기능을 직접 체험할 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors inline-flex items-center justify-center gap-2"
            >
              데모 시작하기
              <ChevronRight size={20} />
            </Link>
            <a
              href="#demo-accounts"
              className="border border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors text-center"
            >
              계정 안내 보기
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white/60 py-10 px-4 text-center text-sm">
        <div className="flex items-center justify-center mb-3">
          <Image src="/logo-sidebar-dark.png" alt="뷰티링크" width={120} height={30} className="object-contain opacity-80" />
        </div>
        <p className="mb-2">미용실·네일샵·뷰티샵을 위한 예약관리 CRM</p>
        <p className="text-xs text-white/30">
          MVP 데모 버전 · 네이버예약 API 제휴 검토 후 공식 연동 예정
        </p>
      </footer>
    </div>
  );
}
