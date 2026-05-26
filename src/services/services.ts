import { db } from "@/lib/firebase";
import { ServiceMenu } from "@/types";
import { getServices as lsGetServices, saveServices as lsSaveServices } from "@/data/mock";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const col = (salonId: string) => collection(db!, `salons/${salonId}/services`);

// ── Read ───────────────────────────────────────────────────────────────────

export async function getServices(salonId: string): Promise<ServiceMenu[]> {
  if (!db) {
    return lsGetServices();
  }

  // 복합 인덱스 불필요: 전체 조회 후 클라이언트 정렬
  const snap = await getDocs(col(salonId));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceMenu));
  return list.sort((a, b) => {
    const catCompare = a.category.localeCompare(b.category);
    if (catCompare !== 0) return catCompare;
    return a.name.localeCompare(b.name);
  });
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function addService(
  salonId: string,
  data: Omit<ServiceMenu, "id">
): Promise<string> {
  if (!db) {
    const newS: ServiceMenu = { ...data, id: `s_${Date.now()}` };
    const all = lsGetServices();
    lsSaveServices([...all, newS]);
    return newS.id;
  }

  const ref = await addDoc(col(salonId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateService(
  salonId: string,
  serviceId: string,
  data: Partial<ServiceMenu>
): Promise<void> {
  if (!db) {
    const all = lsGetServices().map((s) =>
      s.id === serviceId ? { ...s, ...data } : s
    );
    lsSaveServices(all);
    return;
  }

  await updateDoc(doc(db, `salons/${salonId}/services`, serviceId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleServiceActive(
  salonId: string,
  serviceId: string,
  active: boolean
): Promise<void> {
  return updateService(salonId, serviceId, { active });
}
