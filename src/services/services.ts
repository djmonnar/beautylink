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
  data: Omit<ServiceMenu, "id">,
  createdBy?: string
): Promise<string> {
  if (!db) {
    const newS: ServiceMenu = { ...data, id: `s_${Date.now()}` };
    const all = lsGetServices();
    lsSaveServices([...all, newS]);
    return newS.id;
  }

  const ref = await addDoc(col(salonId), {
    ...data,
    createdBy: createdBy ?? null,
    updatedBy: createdBy ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateService(
  salonId: string,
  serviceId: string,
  data: Partial<ServiceMenu>,
  updatedBy?: string
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
    updatedBy: updatedBy ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleServiceActive(
  salonId: string,
  serviceId: string,
  active: boolean,
  updatedBy?: string
): Promise<void> {
  return updateService(salonId, serviceId, { active }, updatedBy);
}

// ── Access Log ─────────────────────────────────────────────────────────────

export function logServiceAccess(
  salonId: string,
  action: string,
  serviceId: string,
  user: { uid: string; name: string; role: string }
): void {
  if (!db) return;
  import("firebase/firestore").then(({ collection: col2, addDoc: add, serverTimestamp: ts }) => {
    add(col2(db!, `salons/${salonId}/accessLogs`), {
      userId: user.uid,
      userName: user.name,
      role: user.role,
      action,
      targetType: "service",
      targetId: serviceId,
      createdAt: ts(),
    }).catch(() => {});
  });
}
