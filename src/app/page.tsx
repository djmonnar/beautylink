import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  Users,
  Scissors,
  MessageSquare,
  Shield,
  CheckCircle,
  AlertCircle,
  Link2,
  ChevronRight,
  Star,
  Clock,
  TrendingUp,
  Lock,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/logo.svg" alt="뷰티링크" width={140} height={36} priority />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900">기능</a>
            <a href="#integration" className="hover:text-gray-900">연동 준비</a>
            <a href="#security" className="hover:text-gray-900">보안</a>
            <a href="#roadmap" className="hover:text-gray-900">로드맵</a>
          </nav>
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            데모 보기
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
                미용실 예약을 한 곳에서<br />
                관리하는{" "}
                <span className="text-blue-600">뷰티샵 CRM</span>
              </h1>

              <p className="text-lg text-gray-600 mb-8 max-w-xl">
                네이버예약·전화예약·방문예약을 한 화면에서 통합 관리하세요.
                디자이너별 예약 캘린더, 고객 방문 이력, 시술 메모까지 한 곳에서.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  href="/dashboard"
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  관리자 데모 보기
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
                {/* Mini dashboard */}
                <div className="bg-[#1e2a4a] px-4 py-3 flex items-center gap-2">
                  <Image src="/logo-icon-mono.svg" alt="뷰티링크" width={22} height={22} className="brightness-0 invert" />
                  <span className="text-white text-sm font-extrabold tracking-[-0.04em]">뷰티링크</span>
                </div>
                <div className="p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "오늘 예약", value: "32건", color: "text-blue-600", bg: "bg-blue-50" },
                      { label: "신규 고객", value: "18명", color: "text-green-600", bg: "bg-green-50" },
                      { label: "매출 (오늘)", value: "1,250,000원", color: "text-purple-600", bg: "bg-purple-50" },
                      { label: "노쇼 건수", value: "2건", color: "text-red-600", bg: "bg-red-50" },
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
                      { time: "09:00", name: "이수진", service: "컷+클리닉", designer: "이수연", src: "네이버", color: "bg-green-100 text-green-700" },
                      { time: "09:30", name: "박인수", service: "볼륨·지운", designer: "이수연", src: "전화", color: "bg-blue-100 text-blue-700" },
                      { time: "10:00", name: "김하나", service: "염색·시연", designer: "김세은", src: "방문", color: "bg-rose-100 text-rose-700" },
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
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">이런 어려움, 겪고 계신가요?</h2>
            <p className="text-gray-600">뷰티샵 운영의 가장 흔한 불편함들을 모아봤습니다.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", title: "예약 누락", desc: "전화·방문 예약이 수기 메모에 남아 빠뜨리기 십상" },
              { icon: CalendarDays, color: "text-orange-500", bg: "bg-orange-50", title: "중복 예약", desc: "디자이너 일정을 모르고 같은 시간에 두 명 잡는 실수" },
              { icon: MessageSquare, color: "text-yellow-500", bg: "bg-yellow-50", title: "전화예약 수기 관리", desc: "공책이나 엑셀로 관리하다 잃어버리거나 알아보기 어려움" },
              { icon: Users, color: "text-blue-500", bg: "bg-blue-50", title: "디자이너별 일정 혼선", desc: "누가 언제 쉬는지, 담당 시술이 무엇인지 한눈에 파악 어려움" },
              { icon: Star, color: "text-purple-500", bg: "bg-purple-50", title: "고객 이력 관리", desc: "재방문 고객의 선호 스타일이나 특이사항을 기억하기 어려움" },
              { icon: TrendingUp, color: "text-green-500", bg: "bg-green-50", title: "매출 파악 어려움", desc: "오늘 얼마 벌었는지, 어떤 메뉴가 잘 팔리는지 분석 불가" },
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

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">뷰티링크의 해결책</h2>
            <p className="text-gray-600">미용실 운영에 필요한 모든 기능을 한 곳에서</p>
          </div>

          <div className="space-y-16">
            {[
              {
                icon: CalendarDays,
                color: "bg-blue-600",
                badge: "핵심 기능",
                title: "예약 통합 캘린더",
                desc: "네이버예약·전화예약·방문예약을 한곳의 캘린더에 자동으로 통합해 보여줍니다. 예약 현황을 실시간으로 파악하고, 스케줄 충돌 없이 효율적으로 관리하세요.",
                points: ["디자이너별 시간표", "예약 출처 색상 구분", "일/주/월 보기", "중복 예약 방지"],
                href: "/calendar",
              },
              {
                icon: Users,
                color: "bg-purple-600",
                badge: "CRM",
                title: "고객관리 CRM",
                desc: "고객의 방문 이력, 선호 디자이너, 시술 내역, 모발 상태, 메모까지 한 곳에 기록해 고객 데이터를 자산으로 만듭니다.",
                points: ["방문 이력 타임라인", "시술 메모 저장", "재방문 주기 관리", "고객 등급 관리"],
                href: "/customers",
              },
              {
                icon: Scissors,
                color: "bg-green-600",
                badge: "운영 관리",
                title: "디자이너·시술 관리",
                desc: "디자이너 스케줄과 시술·메뉴를 체계적으로 관리하세요. 근무시간, 휴무일, 담당 시술을 한눈에 파악할 수 있습니다.",
                points: ["근무시간·휴무 관리", "담당 시술 지정", "시술 메뉴 가격·시간 설정", "디자이너별 예약 현황"],
                href: "/designers",
              },
              {
                icon: MessageSquare,
                color: "bg-orange-500",
                badge: "알림",
                title: "문자·알림톡·노쇼 관리",
                desc: "예약 확정, 리마인드, 취소 안내까지 자동 알림으로 노쇼를 줄이고 고객 만족도를 높이세요.",
                points: ["예약 확정 알림 자동 발송", "전날 리마인드 문자", "노쇼 고객 관리", "취소 사유 분석"],
                href: "/messages",
              },
            ].map((feature, i) => (
              <div key={feature.title} className={`flex flex-col ${i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12`}>
                <div className="flex-1">
                  <div className={`inline-block w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">네이버예약 연동 준비</h2>
            <p className="text-gray-600">공식 API 승인 이후 즉시 연동 활성화가 가능하도록 미리 설정할 수 있습니다.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { num: "01", title: "상점 ID 설정", desc: "매장 정보 입력" },
              { num: "02", title: "디자이너 매칭", desc: "내부↔네이버 연결" },
              { num: "03", title: "시술 메뉴 매칭", desc: "메뉴 1:1 연결" },
              { num: "04", title: "동기화 상태 확인", desc: "90% 준비 완료" },
              { num: "05", title: "API 승인 후 활성화", desc: "승인 즉시 자동 연동" },
            ].map((step) => (
              <div key={step.num} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-3">
                  {step.num}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
            <p className="text-sm text-amber-800">
              <strong>안내:</strong> 현재 네이버예약 API 공식 제휴 검토 중입니다. 승인 완료 후 별도 설정 없이 자동으로 연동이 활성화됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 px-4">
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
                  { title: "접근 로그 기록", desc: "누가 언제 어떤 고객 정보를 조회했는지 기록" },
                  { title: "개인정보 보관·삭제 기준", desc: "법적 기준에 맞는 데이터 보관 및 삭제 정책 제공" },
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
                  { label: "연락처 마스킹", status: "활성화", color: "text-green-400" },
                  { label: "직원 권한 관리", status: "설정 완료", color: "text-green-400" },
                  { label: "접근 로그", status: "기록 중", color: "text-green-400" },
                  { label: "데이터 암호화", status: "적용 중", color: "text-green-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                    <span className="text-sm text-white/80">{item.label}</span>
                    <span className={`text-sm font-medium ${item.color}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">뷰티링크 로드맵</h2>
            <p className="text-gray-600">더 나은 미용실 운영을 위한 여정</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {[
              { num: "01", title: "예약관리", status: "완료", color: "bg-green-600", desc: "통합 예약·캘린더로 운영 효율 향상" },
              { num: "02", title: "고객관리", status: "완료", color: "bg-green-600", desc: "고객 데이터 기반 재방문·매출 성장" },
              { num: "03", title: "연동준비", status: "진행중", color: "bg-blue-600", desc: "네이버예약 API 제휴 검토 후 연동 예정" },
              { num: "04", title: "보안관리", status: "완료", color: "bg-green-600", desc: "데이터 보호와 안정적인 서비스 제공" },
            ].map((step) => (
              <div key={step.num} className="flex-1 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className={`w-10 h-10 ${step.color} text-white rounded-full flex items-center justify-center font-bold text-sm mb-3`}>
                  {step.num}
                </div>
                <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2 ${step.status === "완료" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                  {step.status}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            뷰티링크 MVP 데모를 확인해보세요
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            실제 서비스와 동일한 화면으로 모든 기능을 직접 체험할 수 있습니다.
          </p>
          <Link
            href="/dashboard"
            className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
          >
            관리자 데모 시작하기
            <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white/60 py-10 px-4 text-center text-sm">
        <div className="flex items-center justify-center mb-3">
          <Image src="/logo-icon-mono.svg" alt="뷰티링크" width={24} height={24} className="brightness-0 invert mr-2 opacity-70" />
          <span className="text-white font-extrabold tracking-[-0.04em]">뷰티링크</span>
        </div>
        <p className="mb-2">미용실·네일샵·뷰티샵을 위한 예약관리 CRM</p>
        <p className="text-xs text-white/30">
          MVP 데모 버전 · 네이버예약 API 제휴 검토 후 공식 연동 예정
        </p>
      </footer>
    </div>
  );
}
