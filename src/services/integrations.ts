import { db } from "@/lib/firebase";
import type {
  NaverIntegrationSettings,
  NaverDesignerMappingEntry,
  NaverServiceMappingEntry,
  PermissionRole,
} from "@/types";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// ── 컬렉션 경로 ───────────────────────────────────────────────────────────
// salons/{salonId}/integrationSettings/naver
const naverDoc = (salonId: string) =>
  doc(db!, `salons/${salonId}/integrationSettings/naver`);

// ── 데모 기본값 ───────────────────────────────────────────────────────────
export const DEMO_NAVER_SETTINGS: NaverIntegrationSettings = {
  status: "pending",
  storeId: "",
  shopName: "",
  naverPlaceUrl: "",
  designerMapping: {},
  serviceMapping: {},
  syncReadyPercent: 0,
  logs: [],
};

// ── 연동 준비율 계산 (pure function) ─────────────────────────────────────
/**
 * 점수 기준 (합계 100점):
 *  storeId 입력:           20점
 *  shopName 입력:          10점
 *  naverPlaceUrl 입력:     10점
 *  디자이너 매핑 완료율:   30점
 *  시술 메뉴 매핑 완료율:  30점
 *
 * 디자이너/시술이 0개면 해당 항목은 만점 처리 (매핑할 대상 없음)
 */
export function calcSyncReadyPercent(
  storeId: string,
  shopName: string,
  naverPlaceUrl: string,
  designerEdits: Record<string, string>,
  activeDesignerIds: string[],
  serviceEdits: Record<string, string>,
  activeServiceIds: string[]
): number {
  let score = 0;

  if (storeId.trim()) score += 20;
  if (shopName.trim()) score += 10;
  if (naverPlaceUrl.trim()) score += 10;

  if (activeDesignerIds.length > 0) {
    const mapped = activeDesignerIds.filter((id) => designerEdits[id]?.trim()).length;
    score += Math.round((mapped / activeDesignerIds.length) * 30);
  } else {
    score += 30;
  }

  if (activeServiceIds.length > 0) {
    const mapped = activeServiceIds.filter((id) => serviceEdits[id]?.trim()).length;
    score += Math.round((mapped / activeServiceIds.length) * 30);
  } else {
    score += 30;
  }

  return Math.min(100, score);
}

// ── Read ───────────────────────────────────────────────────────────────────

export async function getNaverSettings(
  salonId: string
): Promise<NaverIntegrationSettings> {
  if (!db) return { ...DEMO_NAVER_SETTINGS };
  const snap = await getDoc(naverDoc(salonId));
  if (!snap.exists()) return { ...DEMO_NAVER_SETTINGS };
  const data = snap.data() as NaverIntegrationSettings;
  // 구버전 문서 호환: designerMapping/serviceMapping이 배열이면 빈 객체로 초기화
  return {
    ...data,
    designerMapping: Array.isArray(data.designerMapping) ? {} : (data.designerMapping ?? {}),
    serviceMapping:  Array.isArray(data.serviceMapping)  ? {} : (data.serviceMapping  ?? {}),
  };
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function saveNaverSettings(
  salonId: string,
  data: Omit<NaverIntegrationSettings, "updatedAt" | "updatedBy">,
  updatedBy?: string
): Promise<void> {
  if (!db) return;
  await setDoc(naverDoc(salonId), {
    ...data,
    updatedBy: updatedBy ?? null,
    updatedAt: serverTimestamp(),
  });
}

// ── 접근 로그 ─────────────────────────────────────────────────────────────

export type NaverAccessAction =
  | "naver_integration_updated"
  | "naver_designer_mapping_updated"
  | "naver_service_mapping_updated"
  | "naver_ready_status_changed";

export function logNaverAccess(
  salonId: string,
  action: NaverAccessAction,
  targetId: string,
  user: { uid: string; name: string; role: PermissionRole }
): void {
  if (!db) return;
  addDoc(collection(db, `salons/${salonId}/accessLogs`), {
    userId: user.uid,
    userName: user.name,
    role: user.role,
    action,
    targetType: "naver_integration",
    targetId,
    createdAt: serverTimestamp(),
  }).catch(() => {});
}

// ── 타입 re-export ─────────────────────────────────────────────────────────
export type { NaverDesignerMappingEntry, NaverServiceMappingEntry };
