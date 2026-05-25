// ============================================================
// Re-export canonical types from @/types
// ============================================================

export type {
  ReservationSource,
  ReservationStatus,
  CustomerGrade,
  DesignerStatus,
  MessageType,
  PermissionRole,
  UserRole,
  MessageChannel,
  Reservation,
  VisitRecord,
  Customer,
  CustomerPrivate,
  Designer,
  ServiceMenu,
  MessageTemplate,
  MessageLog,
  NaverDesignerMapping,
  NaverMenuMapping,
  NaverSyncLog,
  NaverIntegrationSettings,
  AccessLog,
  Salon,
} from "@/types";

export {
  sourceLabel,
  sourceColor,
  statusLabel,
  statusColor,
  gradeColor,
  maskPhone,
  calcEndAt,
} from "@/types";

// ============================================================
// Imported types (for use in this file)
// ============================================================

import type {
  Reservation,
  Customer,
  Designer,
  ServiceMenu,
  MessageLog,
  AccessLog,
} from "@/types";

// ============================================================
// Mock Data
// ============================================================

export const MOCK_DESIGNERS: Designer[] = [
  {
    id: "d1",
    name: "이수연",
    roleTitle: "대표 디자이너",
    status: "active",
    phoneMasked: "010-****-2222",
    profileInitial: "이",
    color: "#3b82f6",
    services: ["여성 컷", "남성 컷", "디자인 펌", "볼륨 매직", "전체 염색"],
    workDays: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "19:00",
    daysOff: [],
    todayReservations: 8,
    totalReservations: 342,
    joinedAt: "2022-03-01",
  },
  {
    id: "d2",
    name: "김세은",
    roleTitle: "디자이너",
    status: "active",
    phoneMasked: "010-****-3333",
    profileInitial: "김",
    color: "#8b5cf6",
    services: ["여성 컷", "전체 염색", "클리닉 기본", "두피 스케일링"],
    workDays: [1, 2, 3, 4, 5, 6],
    startTime: "10:00",
    endTime: "20:00",
    daysOff: [],
    todayReservations: 6,
    totalReservations: 218,
    joinedAt: "2023-01-15",
  },
  {
    id: "d3",
    name: "박지민",
    roleTitle: "디자이너",
    status: "active",
    phoneMasked: "010-****-4444",
    profileInitial: "박",
    color: "#10b981",
    services: ["여성 컷", "남성 컷", "볼륨 매직", "클리닉 기본"],
    workDays: [2, 3, 4, 5, 6],
    startTime: "10:00",
    endTime: "19:00",
    daysOff: ["2025-05-26"],
    todayReservations: 5,
    totalReservations: 187,
    joinedAt: "2023-06-01",
  },
  {
    id: "d4",
    name: "최유정",
    roleTitle: "디자이너",
    status: "off",
    phoneMasked: "010-****-5555",
    profileInitial: "최",
    color: "#f59e0b",
    services: ["여성 컷", "디자인 펌", "전체 염색", "두피 스케일링"],
    workDays: [1, 3, 5, 6],
    startTime: "11:00",
    endTime: "20:00",
    daysOff: ["2025-05-25"],
    todayReservations: 0,
    totalReservations: 156,
    joinedAt: "2024-02-01",
  },
];

export const MOCK_SERVICES: ServiceMenu[] = [
  { id: "s1", category: "컷", name: "여성 컷", price: 30000, duration: 30, assignedDesignerIds: ["d1","d2","d3","d4"], active: true, naverMenuName: "여성커트" },
  { id: "s2", category: "컷", name: "남성 컷", price: 25000, duration: 30, assignedDesignerIds: ["d1","d3"], active: true, naverMenuName: "남성커트" },
  { id: "s3", category: "펌", name: "디자인 펌", price: 120000, duration: 120, assignedDesignerIds: ["d1","d4"], active: true, naverMenuName: "디자인펌" },
  { id: "s4", category: "펌", name: "볼륨 매직", price: 150000, duration: 150, assignedDesignerIds: ["d1","d3"], active: true, naverMenuName: "볼륨매직" },
  { id: "s5", category: "염색", name: "전체 염색", price: 80000, duration: 90, assignedDesignerIds: ["d1","d2","d4"], active: true, naverMenuName: "염색" },
  { id: "s6", category: "염색", name: "부분 염색", price: 50000, duration: 60, assignedDesignerIds: ["d2","d4"], active: true, naverMenuName: "부분염색" },
  { id: "s7", category: "클리닉", name: "클리닉 기본", price: 60000, duration: 60, assignedDesignerIds: ["d2","d3"], active: true, naverMenuName: "클리닉" },
  { id: "s8", category: "두피케어", name: "두피 스케일링", price: 45000, duration: 45, assignedDesignerIds: ["d2","d4"], active: true, naverMenuName: "두피케어" },
  { id: "s9", category: "클리닉", name: "프리미엄 클리닉", price: 120000, duration: 90, assignedDesignerIds: ["d1","d2"], active: false, naverMenuName: "프리미엄클리닉" },
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "김지연",
    phoneMasked: "010-****-5678",
    grade: "VIP",
    preferredDesignerId: "d1",
    preferredDesignerName: "이수연",
    hairType: "가늘고 손상된 모발",
    specialNote: "두피가 민감하여 자극 없는 제품 사용 권장",
    tags: ["VIP", "염색 선호", "클리닉 주기 4주", "긴머리", "열림 경험", "민감성 두피"],
    visitHistory: [
      { date: "2025-05-20", serviceName: "컷 + 클리닉", designerName: "이수연", memo: "손상 케어 진행, 모발 결 정돈 완료", price: 90000 },
      { date: "2025-04-18", serviceName: "부리영색 + 클리닉", designerName: "이수연", memo: "에쉬 브라운 컬러, 두피 진정 케어", price: 130000 },
      { date: "2025-03-16", serviceName: "매직셋팅 + 클리닉", designerName: "이수연", memo: "C컬 펌, 손상도 케어 진행", price: 170000 },
    ],
    nextVisitDate: "2025-06-20",
    totalVisits: 12,
    totalSpent: 980000,
    registeredAt: "2024-05-24",
    lastVisitDate: "2025-05-20",
  },
  {
    id: "c2",
    name: "이수진",
    phoneMasked: "010-****-9876",
    grade: "재방문",
    preferredDesignerId: "d2",
    preferredDesignerName: "김세은",
    hairType: "보통",
    specialNote: "",
    tags: ["재방문", "펌 선호"],
    visitHistory: [
      { date: "2025-05-15", serviceName: "디자인 펌", designerName: "김세은", memo: "S컬 펌, 만족도 높음", price: 120000 },
      { date: "2025-03-10", serviceName: "여성 컷", designerName: "김세은", memo: "레이어드 컷", price: 30000 },
    ],
    nextVisitDate: "2025-06-15",
    totalVisits: 5,
    totalSpent: 350000,
    registeredAt: "2024-09-01",
    lastVisitDate: "2025-05-15",
  },
  {
    id: "c3",
    name: "박소연",
    phoneMasked: "010-****-1234",
    grade: "신규",
    tags: ["신규"],
    visitHistory: [
      { date: "2025-05-18", serviceName: "전체 염색", designerName: "박지민", memo: "밝은 갈색으로 염색", price: 80000 },
    ],
    totalVisits: 1,
    totalSpent: 80000,
    registeredAt: "2025-05-18",
    lastVisitDate: "2025-05-18",
  },
  {
    id: "c4",
    name: "최유정",
    phoneMasked: "010-****-3456",
    grade: "VIP",
    preferredDesignerId: "d1",
    preferredDesignerName: "이수연",
    hairType: "굵고 풍성한 모발",
    tags: ["VIP", "펌 선호", "정기 방문"],
    visitHistory: [
      { date: "2025-05-10", serviceName: "볼륨 매직", designerName: "이수연", memo: "볼륨 살려서 매직", price: 150000 },
      { date: "2025-03-05", serviceName: "전체 염색 + 컷", designerName: "이수연", memo: "블랙 계열 염색", price: 110000 },
    ],
    totalVisits: 18,
    totalSpent: 1450000,
    registeredAt: "2023-08-15",
    lastVisitDate: "2025-05-10",
  },
  {
    id: "c5",
    name: "정다운",
    phoneMasked: "010-****-7890",
    grade: "휴면",
    tags: ["휴면", "장기 미방문"],
    visitHistory: [
      { date: "2024-11-20", serviceName: "여성 컷", designerName: "김세은", memo: "", price: 30000 },
    ],
    totalVisits: 3,
    totalSpent: 120000,
    registeredAt: "2024-06-01",
    lastVisitDate: "2024-11-20",
  },
  {
    id: "c6",
    name: "한지은",
    phoneMasked: "010-****-8765",
    grade: "신규",
    tags: ["신규"],
    visitHistory: [
      { date: "2025-05-08", serviceName: "클리닉 기본", designerName: "박지민", memo: "두피 케어 진행", price: 60000 },
    ],
    totalVisits: 1,
    totalSpent: 60000,
    registeredAt: "2025-05-08",
    lastVisitDate: "2025-05-08",
  },
];

export const MOCK_RESERVATIONS: Reservation[] = [
  { id: "r1", customerId: "c1", customerName: "김지연", customerPhoneMasked: "010-****-5678", designerId: "d1", designerName: "이수연", serviceId: "s7", serviceName: "클리닉 기본", date: "2025-05-25", time: "10:00", duration: 60, source: "naver", status: "confirmed", price: 60000 },
  { id: "r2", customerId: "c2", customerName: "이수진", customerPhoneMasked: "010-****-9876", designerId: "d2", designerName: "김세은", serviceId: "s5", serviceName: "전체 염색", date: "2025-05-25", time: "11:00", duration: 90, source: "phone", status: "confirmed", price: 80000 },
  { id: "r3", customerId: "c3", customerName: "박소연", customerPhoneMasked: "010-****-1234", designerId: "d3", designerName: "박지민", serviceId: "s1", serviceName: "여성 컷", date: "2025-05-25", time: "13:00", duration: 30, source: "visit", status: "confirmed", price: 30000 },
  { id: "r4", customerId: "c4", customerName: "최유정", customerPhoneMasked: "010-****-3456", designerId: "d1", designerName: "이수연", serviceId: "s4", serviceName: "볼륨 매직", date: "2025-05-25", time: "14:00", duration: 150, source: "naver", status: "confirmed", price: 150000 },
  { id: "r5", customerId: "c6", customerName: "한지은", customerPhoneMasked: "010-****-8765", designerId: "d2", designerName: "김세은", serviceId: "s7", serviceName: "클리닉 기본", date: "2025-05-25", time: "15:00", duration: 60, source: "kakao", status: "pending", price: 60000 },
  { id: "r6", customerId: "c5", customerName: "정다운", customerPhoneMasked: "010-****-7890", designerId: "d3", designerName: "박지민", serviceId: "s3", serviceName: "디자인 펌", date: "2025-05-25", time: "10:00", duration: 120, source: "phone", status: "confirmed", price: 120000 },
  { id: "r7", customerId: "c1", customerName: "김지연", customerPhoneMasked: "010-****-5678", designerId: "d1", designerName: "이수연", serviceId: "s5", serviceName: "전체 염색", date: "2025-05-26", time: "10:00", duration: 90, source: "naver", status: "confirmed", price: 80000 },
  { id: "r8", customerId: "c2", customerName: "이수진", customerPhoneMasked: "010-****-9876", designerId: "d2", designerName: "김세은", serviceId: "s1", serviceName: "여성 컷", date: "2025-05-26", time: "14:00", duration: 30, source: "phone", status: "confirmed", price: 30000 },
  { id: "r9", customerId: "c3", customerName: "박소연", customerPhoneMasked: "010-****-1234", designerId: "d1", designerName: "이수연", serviceId: "s2", serviceName: "남성 컷", date: "2025-05-24", time: "11:00", duration: 30, source: "naver", status: "completed", price: 25000 },
  { id: "r10", customerId: "c4", customerName: "최유정", customerPhoneMasked: "010-****-3456", designerId: "d4", designerName: "최유정 디자이너", serviceId: "s5", serviceName: "전체 염색", date: "2025-05-24", time: "13:00", duration: 90, source: "phone", status: "noshow", price: 80000 },
];

export const MOCK_MESSAGE_LOGS: MessageLog[] = [
  { id: "m1", type: "reservation_confirm", customerName: "김지연", phoneMasked: "010-****-5678", content: "예약이 확정되었습니다. 5/25(일) 10:00 이수연 디자이너 클리닉 기본", createdAt: "2025-05-24 14:30", status: "sent", channel: "카카오" },
  { id: "m2", type: "reminder", customerName: "이수진", phoneMasked: "010-****-9876", content: "내일 11:00 예약을 잊지 마세요! 뷰티링크 헤어 강남점", createdAt: "2025-05-24 18:00", status: "sent", channel: "SMS" },
  { id: "m3", type: "noshow", customerName: "최유정", phoneMasked: "010-****-3456", content: "노쇼 처리되었습니다. 재예약 시 별도 안내 드리겠습니다.", createdAt: "2025-05-24 13:30", status: "sent", channel: "SMS" },
  { id: "m4", type: "cancel", customerName: "정다운", phoneMasked: "010-****-7890", content: "예약 취소가 완료되었습니다. 다음에 또 방문해주세요.", createdAt: "2025-05-23 10:15", status: "sent", channel: "카카오" },
  { id: "m5", type: "reminder", customerName: "박소연", phoneMasked: "010-****-1234", content: "내일 13:00 예약을 잊지 마세요! 뷰티링크 헤어 강남점", createdAt: "2025-05-24 18:00", status: "failed", channel: "SMS" },
];

export const MOCK_ACCESS_LOGS: AccessLog[] = [
  { id: "al1", userId: "u1", userName: "김지연", role: "원장", action: "고객 정보 조회", targetType: "customer", targetId: "c2", createdAt: "2025-05-25 09:42" },
  { id: "al2", userId: "u2", userName: "이수연", role: "디자이너", action: "예약 등록", targetType: "reservation", targetId: "r11", createdAt: "2025-05-25 09:15" },
  { id: "al3", userId: "u3", userName: "김세은", role: "디자이너", action: "고객 시술 메모 수정", targetType: "customer", targetId: "c3", createdAt: "2025-05-25 08:55" },
  { id: "al4", userId: "u4", userName: "박지민", role: "디자이너", action: "예약 상태 변경", targetType: "reservation", targetId: "r3", createdAt: "2025-05-25 08:30" },
  { id: "al5", userId: "u1", userName: "김지연", role: "원장", action: "직원 권한 수정", targetType: "designer", targetId: "d3", createdAt: "2025-05-24 18:00" },
];

// Chart data for dashboard
export const HOURLY_CHART_DATA = [
  { hour: "09시", 예약수: 2, 매출: 90000 },
  { hour: "10시", 예약수: 5, 매출: 350000 },
  { hour: "11시", 예약수: 6, 매출: 420000 },
  { hour: "12시", 예약수: 3, 매출: 210000 },
  { hour: "13시", 예약수: 7, 매출: 490000 },
  { hour: "14시", 예약수: 5, 매출: 350000 },
  { hour: "15시", 예약수: 4, 매출: 280000 },
  { hour: "16시", 예약수: 6, 매출: 420000 },
  { hour: "17시", 예약수: 4, 매출: 280000 },
  { hour: "18시", 예약수: 2, 매출: 140000 },
];

export const SOURCE_CHART_DATA = [
  { name: "네이버예약", value: 50, color: "#10b981" },
  { name: "전화예약", value: 33, color: "#3b82f6" },
  { name: "방문예약", value: 17, color: "#f43f5e" },
];

export const CANCEL_REASON_DATA = [
  { name: "일정 변경", value: 45, color: "#3b82f6" },
  { name: "개인 사정", value: 30, color: "#8b5cf6" },
  { name: "컨디션 불량", value: 15, color: "#f59e0b" },
  { name: "기타", value: 10, color: "#94a3b8" },
];

// ============================================================
// localStorage helpers (demo mode fallback)
// ============================================================

const LS_KEYS = {
  reservations: "bl_reservations",
  customers: "bl_customers",
  services: "bl_services",
};

export function getReservations(): Reservation[] {
  if (typeof window === "undefined") return MOCK_RESERVATIONS;
  const stored = localStorage.getItem(LS_KEYS.reservations);
  return stored ? JSON.parse(stored) : MOCK_RESERVATIONS;
}

export function saveReservations(data: Reservation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEYS.reservations, JSON.stringify(data));
}

export function addReservation(r: Reservation) {
  const all = getReservations();
  all.push(r);
  saveReservations(all);
}

export function getCustomers(): Customer[] {
  if (typeof window === "undefined") return MOCK_CUSTOMERS;
  const stored = localStorage.getItem(LS_KEYS.customers);
  return stored ? JSON.parse(stored) : MOCK_CUSTOMERS;
}

export function saveCustomers(data: Customer[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEYS.customers, JSON.stringify(data));
}

export function getServices(): ServiceMenu[] {
  if (typeof window === "undefined") return MOCK_SERVICES;
  const stored = localStorage.getItem(LS_KEYS.services);
  return stored ? JSON.parse(stored) : MOCK_SERVICES;
}

export function saveServices(data: ServiceMenu[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEYS.services, JSON.stringify(data));
}

export function resetDemoData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_KEYS.reservations);
  localStorage.removeItem(LS_KEYS.customers);
  localStorage.removeItem(LS_KEYS.services);
}
