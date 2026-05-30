import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import type { UserRole, PermissionRole } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────

export interface StaffMember {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  salonId: string;
  designerId?: string | null;
  phoneMasked?: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type StaffAccessAction =
  | "user_role_updated"
  | "user_active_status_updated"
  | "user_designer_linked"
  | "user_permission_viewed";

// ── Read ──────────────────────────────────────────────────────────────────

/**
 * 같은 salonId에 속한 직원 목록 조회.
 * Firestore Rules: owner/manager는 같은 salonId users 읽기 허용.
 * 복합 인덱스 회피 — where 1개 후 클라이언트 정렬.
 */
export async function getStaffMembers(salonId: string): Promise<StaffMember[]> {
  if (!db) return [];
  const q = query(collection(db, "users"), where("salonId", "==", salonId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ ...d.data(), uid: d.id } as StaffMember));
  // 클라이언트 정렬: 원장 먼저, 이후 이름순
  return list.sort((a, b) => {
    const roleOrder = (r: UserRole) =>
      r === "owner" ? 0 : r === "manager" ? 1 : 2;
    if (roleOrder(a.role) !== roleOrder(b.role))
      return roleOrder(a.role) - roleOrder(b.role);
    return a.name.localeCompare(b.name, "ko");
  });
}

// ── Write ─────────────────────────────────────────────────────────────────

/** 직원 역할 변경 (owner만 호출 가능) */
export async function updateStaffRole(
  uid: string,
  role: UserRole,
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, "users", uid), { role, updatedAt: serverTimestamp() });
}

/** 직원 활성 상태 변경 (owner만 호출 가능) */
export async function updateStaffActive(
  uid: string,
  isActive: boolean,
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, "users", uid), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

/** 직원 ↔ 디자이너 연결 변경 (owner만 호출 가능) */
export async function updateStaffDesignerLink(
  uid: string,
  designerId: string | null,
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, "users", uid), {
    designerId: designerId ?? null,
    updatedAt: serverTimestamp(),
  });
}

// ── Access Log ────────────────────────────────────────────────────────────

export function logStaffAccess(
  salonId: string,
  action: StaffAccessAction,
  targetUid: string,
  user: { uid: string; name: string; role: PermissionRole },
): void {
  if (!db) return;
  addDoc(collection(db, `salons/${salonId}/accessLogs`), {
    userId: user.uid,
    userName: user.name,
    role: user.role,
    action,
    targetType: "user",
    targetId: targetUid,
    createdAt: serverTimestamp(),
  }).catch(() => {});
}
