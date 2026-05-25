import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  collection,
  writeBatch,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import {
  MOCK_DESIGNERS,
  MOCK_SERVICES,
  MOCK_CUSTOMERS,
  MOCK_RESERVATIONS,
} from "@/data/mock";

export const SALON_ID = "salon1";

export interface SeedResult {
  ok: boolean;
  message: string;
  details: string[];
}

export async function seedFirestore(
  uid: string,
  userEmail: string,
  userName: string
): Promise<SeedResult> {
  if (!db) return { ok: false, message: "Firebase 미연결", details: [] };

  const details: string[] = [];

  try {
    // ── 1. Salon 문서 ─────────────────────────────────────────
    await setDoc(doc(db, "salons", SALON_ID), {
      id: SALON_ID,
      name: "뷰티링크 헤어 강남점",
      phone: "02-1234-5678",
      address: "서울시 강남구 테헤란로 123",
      plan: "pro",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    details.push("✅ 매장 정보 생성");

    // ── 2. 사용자(owner) 문서 ────────────────────────────────
    await setDoc(doc(db, "users", uid), {
      uid,
      email: userEmail,
      name: userName,
      role: "owner",
      salonId: SALON_ID,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    details.push("✅ 관리자 계정 문서 생성");

    // ── 3. 디자이너 ──────────────────────────────────────────
    {
      const batch = writeBatch(db);
      for (const d of MOCK_DESIGNERS) {
        const ref = doc(collection(db, `salons/${SALON_ID}/designers`), d.id);
        batch.set(ref, { ...d, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      await batch.commit();
      details.push(`✅ 디자이너 ${MOCK_DESIGNERS.length}명 생성`);
    }

    // ── 4. 시술 메뉴 ─────────────────────────────────────────
    {
      const batch = writeBatch(db);
      for (const s of MOCK_SERVICES) {
        const ref = doc(collection(db, `salons/${SALON_ID}/services`), s.id);
        batch.set(ref, { ...s, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      await batch.commit();
      details.push(`✅ 시술 메뉴 ${MOCK_SERVICES.length}개 생성`);
    }

    // ── 5. 고객 ──────────────────────────────────────────────
    {
      const batch = writeBatch(db);
      for (const c of MOCK_CUSTOMERS) {
        const ref = doc(collection(db, `salons/${SALON_ID}/customers`), c.id);
        batch.set(ref, { ...c, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      await batch.commit();
      details.push(`✅ 고객 ${MOCK_CUSTOMERS.length}명 생성`);
    }

    // ── 6. 예약 ──────────────────────────────────────────────
    {
      const batch = writeBatch(db);
      for (const r of MOCK_RESERVATIONS) {
        const ref = doc(collection(db, `salons/${SALON_ID}/reservations`), r.id);
        batch.set(ref, { ...r, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      await batch.commit();
      details.push(`✅ 예약 ${MOCK_RESERVATIONS.length}건 생성`);
    }

    return { ok: true, message: "🎉 Firestore 초기 데이터 세팅 완료!", details };
  } catch (err) {
    console.error("Seed error:", err);
    return {
      ok: false,
      message: "❌ 오류 발생: " + (err as Error).message,
      details,
    };
  }
}

export async function checkSeedStatus(): Promise<boolean> {
  if (!db) return false;
  try {
    const snap = await getDocs(collection(db, `salons/${SALON_ID}/designers`));
    return !snap.empty;
  } catch {
    return false;
  }
}
