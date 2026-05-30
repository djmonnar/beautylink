// ============================================================
// Primitive Types
// ============================================================

export type ReservationSource = "naver" | "phone" | "visit" | "kakao";
export type ReservationStatus = "confirmed" | "pending" | "cancelled" | "noShow" | "completed";
export type CustomerGrade = "VIP" | "신규" | "재방문" | "휴면";
export type DesignerStatus = "active" | "off" | "inactive";
export type MessageType = "reservation_confirm" | "reminder" | "cancel" | "noshow" | "revisit";
export type PermissionRole = "원장" | "매니저" | "디자이너";
export type UserRole = "owner" | "manager" | "designer";
export type MessageChannel = "SMS" | "알림톡" | "카카오" | "LMS";

// ============================================================
// Domain Interfaces
// ============================================================

export interface Reservation {
  id: string;
  customerId: string;
  customerName: string;
  customerPhoneMasked: string;
  designerId: string;
  designerName: string;
  serviceId: string;
  serviceName: string;
  date: string;           // YYYY-MM-DD
  time: string;           // HH:mm
  startAt?: string;       // ISO string
  endAt?: string;         // ISO string
  duration: number;       // minutes
  source: ReservationSource;
  status: ReservationStatus;
  note?: string;
  internalMemo?: string;  // 내부 메모 (직원용)
  price: number;
  // 상태 변경 타임스탬프
  completedAt?: string;
  noShowAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  // 메타
  createdBy?: string;     // uid
  updatedBy?: string;     // uid
  createdAt?: string;
  updatedAt?: string;
}

export interface VisitRecord {
  reservationId?: string; // 중복 방지용
  date: string;
  serviceName: string;
  designerName: string;
  memo: string;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  phoneMasked: string;
  grade: CustomerGrade;
  preferredDesignerId?: string;
  preferredDesignerName?: string;
  hairType?: string;
  specialNote?: string;
  tags: string[];
  visitHistory: VisitRecord[];
  nextVisitDate?: string;
  totalVisits: number;
  totalSpent: number;
  registeredAt: string;
  lastVisitDate?: string;
  noShowCount?: number;
  lastNoShowDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerPrivate {
  phoneRaw: string;
  email?: string;
  kakaoId?: string;
  consentMarketing?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Designer {
  id: string;
  name: string;
  roleTitle: string;
  phoneMasked?: string;
  status: DesignerStatus;
  profileInitial: string;
  color: string;
  services: string[];        // 담당 시술명 배열
  serviceIds?: string[];     // 담당 시술 ID 배열
  workDays: number[];        // 0=일 ~ 6=토
  startTime: string;
  endTime: string;
  daysOff: string[];         // YYYY-MM-DD
  memo?: string;
  todayReservations?: number;
  totalReservations?: number;
  joinedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;        // uid
  updatedBy?: string;        // uid
}

export interface ServiceMenu {
  id: string;
  category: "컷" | "펌" | "염색" | "클리닉" | "두피케어" | "스타일링" | "기타";
  name: string;
  price: number;
  duration: number;
  assignedDesignerIds: string[];
  active: boolean;
  description?: string;
  naverMenuName?: string;
  assignedDesignerNames?: string[];
  createdBy?: string;    // uid
  updatedBy?: string;    // uid
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageTemplate {
  id: string;
  type: MessageType;
  title: string;
  content: string;
  channel: MessageChannel;
  active: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageLog {
  id: string;
  templateId?: string;
  templateTitle?: string;
  type: MessageType;
  customerId?: string;
  customerName: string;
  phoneMasked: string;
  reservationId?: string;
  content: string;
  channel: MessageChannel;
  status: "mock_sent" | "sent" | "failed" | "pending";
  errorMessage?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface NaverDesignerMapping {
  internalId: string;
  internalName: string;
  naverName: string;
  matched: boolean;
}

export interface NaverMenuMapping {
  internalName: string;
  naverName: string;
  matched: boolean;
}

export interface NaverSyncLog {
  title: string;
  sub: string;
  status: "완료" | "진행중" | "실패";
  time: string;
}

export interface NaverIntegrationSettings {
  status: "pending" | "ready" | "approved" | "disabled";
  storeId: string;
  shopName: string;
  designerMapping: NaverDesignerMapping[];
  serviceMapping: NaverMenuMapping[];
  syncReadyPercent: number;
  lastSyncAt?: string;
  logs: NaverSyncLog[];
  updatedAt?: string;
}

export interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  role: PermissionRole;
  action: string;
  targetType?: string;
  targetId?: string;
  createdAt?: string;
}

export interface Salon {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  businessHours?: string;       // 파생 문자열 "평일 09:00~19:00 / 주말 10:00~18:00 / 휴무 일요일"
  weekdayStart?: string;         // "09:00"
  weekdayEnd?: string;           // "19:00"
  weekendStart?: string;         // "10:00"
  weekendEnd?: string;           // "18:00"
  regularClosedDays?: number[];  // [0]=일, [1]=월 … [6]=토
  description?: string;
  naverPlaceUrl?: string;
  plan: "free" | "starter" | "pro";
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// Utility Functions
// ============================================================

export function sourceLabel(source: ReservationSource): string {
  const map: Record<ReservationSource, string> = {
    naver: "네이버예약",
    phone: "전화예약",
    visit: "방문예약",
    kakao: "카카오",
  };
  return map[source];
}

export function sourceColor(source: ReservationSource): string {
  const map: Record<ReservationSource, string> = {
    naver: "bg-emerald-100 text-emerald-700",
    phone: "bg-blue-100 text-blue-700",
    visit: "bg-rose-100 text-rose-700",
    kakao: "bg-purple-100 text-purple-700",
  };
  return map[source];
}

export function statusLabel(status: ReservationStatus): string {
  const map: Record<ReservationStatus, string> = {
    confirmed: "확정",
    pending: "대기",
    cancelled: "취소",
    noShow: "노쇼",
    completed: "완료",
  };
  return map[status];
}

export function statusColor(status: ReservationStatus): string {
  const map: Record<ReservationStatus, string> = {
    confirmed: "bg-blue-100 text-blue-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-gray-100 text-gray-500",
    noShow: "bg-red-100 text-red-700",
    completed: "bg-green-100 text-green-700",
  };
  return map[status];
}

export function gradeColor(grade: CustomerGrade): string {
  const map: Record<CustomerGrade, string> = {
    VIP: "bg-amber-100 text-amber-700",
    신규: "bg-blue-100 text-blue-700",
    재방문: "bg-green-100 text-green-700",
    휴면: "bg-gray-100 text-gray-500",
  };
  return map[grade];
}

export function maskPhone(raw: string): string {
  return raw.replace(/(\d{3})-(\d{4})-(\d{4})/, "$1-****-$3");
}

export function calcEndAt(date: string, time: string, duration: number): string {
  const [h, m] = time.split(":").map(Number);
  const start = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
  start.setMinutes(start.getMinutes() + duration);
  return start.toISOString();
}
