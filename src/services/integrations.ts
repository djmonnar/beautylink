import { db } from "@/lib/firebase";
import { NaverIntegrationSettings } from "@/types";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const naverDoc = (salonId: string) =>
  doc(db!, `salons/${salonId}/integrations/naver`);

const DEMO_NAVER_SETTINGS: NaverIntegrationSettings = {
  status: "pending",
  storeId: "beautylink_hair",
  shopName: "뷰티링크 헤어 강남점",
  designerMapping: [],
  serviceMapping: [],
  syncReadyPercent: 90,
  logs: [
    { title: "디자이너 정보 동기화", sub: "20개 중 18개 동기화 완료", status: "완료", time: "2024-05-21 14:30:12" },
    { title: "시술 메뉴 동기화", sub: "25개 중 24개 동기화 완료", status: "완료", time: "2024-05-21 14:28:05" },
    { title: "예약 데이터 동기화", sub: "최근 7일 예약 동기화 중 (72%)", status: "진행중", time: "2024-05-21 14:25:10" },
    { title: "상점 정보 확인", sub: "상점 ID 연결 확인 완료", status: "완료", time: "2024-05-21 14:20:01" },
  ],
};

// ── Read ───────────────────────────────────────────────────────────────────

export async function getNaverSettings(salonId: string): Promise<NaverIntegrationSettings> {
  if (!db) return DEMO_NAVER_SETTINGS;

  const snap = await getDoc(naverDoc(salonId));
  if (!snap.exists()) return DEMO_NAVER_SETTINGS;
  return snap.data() as NaverIntegrationSettings;
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function updateNaverSettings(
  salonId: string,
  data: Partial<NaverIntegrationSettings>
): Promise<void> {
  if (!db) return;

  const snap = await getDoc(naverDoc(salonId));
  if (snap.exists()) {
    await updateDoc(naverDoc(salonId), { ...data, updatedAt: serverTimestamp() });
  } else {
    await setDoc(naverDoc(salonId), { ...DEMO_NAVER_SETTINGS, ...data, updatedAt: serverTimestamp() });
  }
}
