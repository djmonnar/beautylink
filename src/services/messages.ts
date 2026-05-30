import { db } from "@/lib/firebase";
import type {
  MessageTemplate,
  MessageLog,
  MessageType,
  MessageChannel,
  PermissionRole,
  Reservation,
} from "@/types";
import { MOCK_RESERVATIONS } from "@/data/mock";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

// ── 컬렉션 참조 ────────────────────────────────────────────────────────────
const templateCol = (salonId: string) =>
  collection(db!, `salons/${salonId}/messageTemplates`);
const logCol = (salonId: string) =>
  collection(db!, `salons/${salonId}/messageLogs`);

// ── Timestamp 정렬 헬퍼 ───────────────────────────────────────────────────
function tsMs(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "string") return new Date(val).getTime();
  const ts = val as { toDate?: () => Date; seconds?: number };
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  return 0;
}

// ── 기본 템플릿 데이터 ────────────────────────────────────────────────────
export const DEFAULT_TEMPLATES: Omit<MessageTemplate, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">[] = [
  {
    type: "reservation_confirm",
    title: "예약 확정 안내",
    channel: "SMS",
    active: true,
    content:
      "[{매장명}] {고객명}님, 예약이 확정되었습니다.\n📅 {예약일} {예약시간}\n💇 {시술명}\n👤 {디자이너명} 디자이너\n감사합니다!",
  },
  {
    type: "reminder",
    title: "방문 전날 리마인드",
    channel: "알림톡",
    active: true,
    content:
      "[{매장명}] {고객명}님, 내일 예약을 잊지 마세요!\n📅 {예약일} {예약시간}\n💇 {시술명}\n✂️ {디자이너명} 디자이너\n문의: {매장전화}",
  },
  {
    type: "cancel",
    title: "예약 취소 안내",
    channel: "SMS",
    active: true,
    content:
      "[{매장명}] {고객명}님의 예약이 취소되었습니다.\n취소된 예약: {예약일} {예약시간} {시술명}\n다음에 또 방문해 주세요!",
  },
  {
    type: "noshow",
    title: "노쇼 안내",
    channel: "SMS",
    active: true,
    content:
      "[{매장명}] {고객명}님, 오늘 예약에 방문하지 않으셨습니다.\n재예약을 원하시면 {매장전화}로 문의해 주세요.",
  },
  {
    type: "revisit",
    title: "재방문 안내",
    channel: "카카오",
    active: true,
    content:
      "[{매장명}] {고객명}님, 지난 방문 이후 시간이 흘렀네요 😊\n다시 방문하시면 최상의 서비스로 모시겠습니다.\n예약 문의: {매장전화}",
  },
];

// ── Templates ──────────────────────────────────────────────────────────────

export async function getMessageTemplates(
  salonId: string
): Promise<MessageTemplate[]> {
  if (!db) {
    return DEFAULT_TEMPLATES.map((t, i) => ({
      ...t,
      id: `demo_t_${i}`,
      createdAt: "2025-05-25T00:00:00",
      updatedAt: "2025-05-25T00:00:00",
    }));
  }
  const snap = await getDocs(templateCol(salonId));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MessageTemplate));
  // 클라이언트 정렬: createdAt ASC
  return list.sort((a, b) => tsMs(a.createdAt) - tsMs(b.createdAt));
}

export async function addMessageTemplate(
  salonId: string,
  data: Omit<MessageTemplate, "id" | "createdAt" | "updatedAt">,
  createdBy?: string
): Promise<string> {
  if (!db) return `demo_t_${Date.now()}`;
  const ref = await addDoc(templateCol(salonId), {
    ...data,
    createdBy: createdBy ?? null,
    updatedBy: createdBy ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMessageTemplate(
  salonId: string,
  templateId: string,
  data: Partial<Omit<MessageTemplate, "id" | "createdAt" | "updatedAt">>,
  updatedBy?: string
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, `salons/${salonId}/messageTemplates`, templateId), {
    ...data,
    updatedBy: updatedBy ?? null,
    updatedAt: serverTimestamp(),
  });
}

/** 소프트 비활성화 (deleteDoc 절대 금지) */
export async function toggleTemplateActive(
  salonId: string,
  templateId: string,
  active: boolean,
  updatedBy?: string
): Promise<void> {
  return updateMessageTemplate(salonId, templateId, { active }, updatedBy);
}

/** 기본 템플릿 일괄 생성 (템플릿 0개일 때 사용) */
export async function seedDefaultTemplates(
  salonId: string,
  createdBy?: string
): Promise<void> {
  if (!db) return;
  for (const t of DEFAULT_TEMPLATES) {
    await addDoc(templateCol(salonId), {
      ...t,
      createdBy: createdBy ?? null,
      updatedBy: createdBy ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

// ── Logs ───────────────────────────────────────────────────────────────────

const DEMO_LOGS: MessageLog[] = [
  {
    id: "demo_log_1",
    templateId: "demo_t_0",
    templateTitle: "예약 확정 안내",
    type: "reservation_confirm",
    customerName: "홍길동",
    phoneMasked: "010-****-5678",
    content: "[뷰티링크 헤어] 홍길동님, 예약이 확정되었습니다.",
    channel: "SMS",
    status: "mock_sent",
    createdAt: "2025-05-25T09:00:00",
  },
  {
    id: "demo_log_2",
    templateId: "demo_t_1",
    templateTitle: "방문 전날 리마인드",
    type: "reminder",
    customerName: "김영희",
    phoneMasked: "010-****-9012",
    content: "[뷰티링크 헤어] 김영희님, 내일 예약을 잊지 마세요!",
    channel: "알림톡",
    status: "mock_sent",
    createdAt: "2025-05-25T08:30:00",
  },
  {
    id: "demo_log_3",
    templateId: "demo_t_3",
    templateTitle: "노쇼 안내",
    type: "noshow",
    customerName: "이철수",
    phoneMasked: "010-****-3456",
    content: "[뷰티링크 헤어] 이철수님, 오늘 예약에 방문하지 않으셨습니다.",
    channel: "SMS",
    status: "mock_sent",
    createdAt: "2025-05-25T14:00:00",
  },
];

export async function getMessageLogs(salonId: string): Promise<MessageLog[]> {
  if (!db) return DEMO_LOGS;
  const snap = await getDocs(logCol(salonId));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MessageLog));
  // 클라이언트 정렬: 최신순
  return list.sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt));
}

export async function addMessageLog(
  salonId: string,
  data: Omit<MessageLog, "id" | "createdAt">
): Promise<string> {
  if (!db) return `demo_log_${Date.now()}`;
  const ref = await addDoc(logCol(salonId), {
    ...data,
    status: "mock_sent",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ── 노쇼 예약 조회 ────────────────────────────────────────────────────────
/** 단일 필드 where("status","==","noShow") — 복합 인덱스 불필요 */
export async function getNoShowReservations(salonId: string): Promise<Reservation[]> {
  if (!db) {
    return MOCK_RESERVATIONS.filter((r) => r.status === "noShow");
  }
  const q = query(
    collection(db, `salons/${salonId}/reservations`),
    where("status", "==", "noShow")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reservation));
}

// ── 접근 로그 기록 ────────────────────────────────────────────────────────

export type MessageAccessAction =
  | "message_template_created"
  | "message_template_updated"
  | "message_template_deactivated"
  | "message_mock_sent"
  | "no_show_message_mock_sent";

export function logMessageAccess(
  salonId: string,
  action: MessageAccessAction,
  targetId: string,
  user: { uid: string; name: string; role: PermissionRole }
): void {
  if (!db) return;
  addDoc(collection(db, `salons/${salonId}/accessLogs`), {
    userId: user.uid,
    userName: user.name,
    role: user.role,
    action,
    targetType: "message",
    targetId,
    createdAt: serverTimestamp(),
  }).catch(() => {});
}

// ── 변수 치환 헬퍼 ────────────────────────────────────────────────────────
export interface MessageVars {
  고객명?: string;
  예약일?: string;
  예약시간?: string;
  디자이너명?: string;
  시술명?: string;
  매장명?: string;
  매장전화?: string;
}

export function applyVars(content: string, vars: MessageVars): string {
  let result = content;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(`{${k}}`, v ?? "");
  }
  return result;
}

export const PREVIEW_SAMPLE_VARS: MessageVars = {
  고객명: "홍길동",
  예약일: "2026-06-15",
  예약시간: "14:00",
  디자이너명: "김디자이너",
  시술명: "컷+드라이",
  매장명: "뷰티링크 헤어",
  매장전화: "02-1234-5678",
};

// ── 채널 레이블 ────────────────────────────────────────────────────────────
export const CHANNEL_OPTIONS: MessageChannel[] = ["SMS", "알림톡", "카카오", "LMS"];
export const TYPE_OPTIONS: MessageType[] = [
  "reservation_confirm",
  "reminder",
  "cancel",
  "noshow",
  "revisit",
];
export const TYPE_LABELS: Record<MessageType, string> = {
  reservation_confirm: "예약확정",
  reminder: "리마인드",
  cancel: "취소안내",
  noshow: "노쇼안내",
  revisit: "재방문",
};
export const TYPE_COLORS: Record<MessageType, string> = {
  reservation_confirm: "bg-green-100 text-green-700",
  reminder: "bg-blue-100 text-blue-700",
  cancel: "bg-orange-100 text-orange-700",
  noshow: "bg-red-100 text-red-700",
  revisit: "bg-purple-100 text-purple-700",
};
