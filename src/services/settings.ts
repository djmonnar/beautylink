import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import type { Salon } from "@/types";

// ── 내 정보 (users/{uid}) ──────────────────────────────────

export interface UserProfileUpdate {
  name?: string;
  phoneMasked?: string;
}

export async function updateUserProfile(
  uid: string,
  data: UserProfileUpdate
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ── 매장 정보 (salons/{salonId}) ───────────────────────────

export async function getSalon(salonId: string): Promise<Salon | null> {
  if (!db) {
    // Demo fallback
    return {
      id: salonId,
      name: "뷰티링크 헤어 강남점",
      phone: "02-1234-5678",
      address: "서울시 강남구 테헤란로 123",
      businessHours: "09:00~19:00",
      description: "강남 대표 헤어 살롱",
      naverPlaceUrl: "",
      plan: "pro",
    };
  }
  const snap = await getDoc(doc(db, "salons", salonId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Salon;
}

export interface SalonUpdate {
  name?: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  description?: string;
  naverPlaceUrl?: string;
}

export async function updateSalon(
  salonId: string,
  data: SalonUpdate
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, "salons", salonId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ── 비밀번호 재설정 이메일 ────────────────────────────────

export async function sendPasswordReset(email: string): Promise<void> {
  if (!auth) throw new Error("Firebase가 설정되지 않았습니다.");
  await sendPasswordResetEmail(auth, email);
}
