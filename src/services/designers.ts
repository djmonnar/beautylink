import { db } from "@/lib/firebase";
import type { Designer, PermissionRole } from "@/types";
import { MOCK_DESIGNERS } from "@/data/mock";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const col = (salonId: string) => collection(db!, `salons/${salonId}/designers`);

// ── Read ───────────────────────────────────────────────────────────────────

export async function getDesigners(salonId: string): Promise<Designer[]> {
  if (!db) return MOCK_DESIGNERS;

  // orderBy("joinedAt") 는 해당 필드 없는 신규 디자이너를 제외할 수 있으므로
  // 전체를 가져와 클라이언트에서 정렬
  const snap = await getDocs(col(salonId));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Designer));
  return list.sort((a, b) => {
    const da = a.joinedAt || a.createdAt || "";
    const db_ = b.joinedAt || b.createdAt || "";
    return da.localeCompare(db_);
  });
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function addDesigner(
  salonId: string,
  data: Omit<Designer, "id">,
  createdBy?: { uid: string; name: string }
): Promise<string> {
  if (!db) return `d_${Date.now()}`;

  const ref = await addDoc(col(salonId), {
    ...data,
    createdBy: createdBy?.uid ?? "",
    updatedBy: createdBy?.uid ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDesigner(
  salonId: string,
  designerId: string,
  data: Partial<Designer>,
  updatedBy?: { uid: string }
): Promise<void> {
  if (!db) return;

  await updateDoc(doc(db, `salons/${salonId}/designers`, designerId), {
    ...data,
    updatedBy: updatedBy?.uid ?? "",
    updatedAt: serverTimestamp(),
  });
}

export async function updateDesignerStatus(
  salonId: string,
  designerId: string,
  status: Designer["status"],
  updatedBy?: { uid: string }
): Promise<void> {
  return updateDesigner(salonId, designerId, { status }, updatedBy);
}

/** 실제 삭제 대신 inactive 처리 */
export async function deactivateDesigner(
  salonId: string,
  designerId: string,
  updatedBy?: { uid: string }
): Promise<void> {
  return updateDesigner(salonId, designerId, { status: "inactive" }, updatedBy);
}

// ── 접근 로그 기록 (non-blocking) ──────────────────────────────────────────

export function logDesignerAccess(
  salonId: string,
  action: string,
  designerId: string,
  user: { uid: string; name: string; role: PermissionRole }
): void {
  if (!db) return;
  addDoc(collection(db, `salons/${salonId}/accessLogs`), {
    userId: user.uid,
    userName: user.name,
    role: user.role,
    action,
    targetType: "designer",
    targetId: designerId,
    createdAt: serverTimestamp(),
  }).catch(() => {});
}
