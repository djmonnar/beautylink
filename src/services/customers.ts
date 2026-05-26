import { db } from "@/lib/firebase";
import type { Customer, CustomerPrivate, PermissionRole } from "@/types";
import { MOCK_CUSTOMERS, getCustomers as lsGetCustomers, saveCustomers as lsSaveCustomers } from "@/data/mock";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const col = (salonId: string) => collection(db!, `salons/${salonId}/customers`);
const privateDoc = (salonId: string, customerId: string) =>
  doc(db!, `salons/${salonId}/customerPrivate/${customerId}`);

// ── Read ───────────────────────────────────────────────────────────────────

export async function getCustomers(salonId: string): Promise<Customer[]> {
  if (!db) return lsGetCustomers();

  // orderBy("lastVisitDate") 는 해당 필드 없는 신규 고객을 제외하므로
  // 전체를 가져와 클라이언트에서 정렬
  const snap = await getDocs(col(salonId));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
  return list.sort((a, b) => {
    const da = a.lastVisitDate || a.registeredAt || "";
    const db_ = b.lastVisitDate || b.registeredAt || "";
    return db_.localeCompare(da);
  });
}

export async function getCustomer(salonId: string, customerId: string): Promise<Customer | null> {
  if (!db) return MOCK_CUSTOMERS.find((c) => c.id === customerId) ?? null;
  const snap = await getDoc(doc(db, `salons/${salonId}/customers`, customerId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Customer;
}

export async function getCustomerPrivate(
  salonId: string,
  customerId: string
): Promise<CustomerPrivate | null> {
  if (!db) return { phoneRaw: "010-0000-0000" };
  const snap = await getDoc(privateDoc(salonId, customerId));
  if (!snap.exists()) return null;
  return snap.data() as CustomerPrivate;
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function addCustomer(
  salonId: string,
  data: Omit<Customer, "id">,
  privateData?: CustomerPrivate
): Promise<string> {
  if (!db) {
    const newC: Customer = { ...data, id: `c_${Date.now()}` };
    const all = lsGetCustomers();
    lsSaveCustomers([...all, newC]);
    return newC.id;
  }

  const ref = await addDoc(col(salonId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (privateData) {
    await setDoc(privateDoc(salonId, ref.id), {
      ...privateData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return ref.id;
}

export async function updateCustomer(
  salonId: string,
  customerId: string,
  data: Partial<Customer>
): Promise<void> {
  if (!db) {
    const all = lsGetCustomers().map((c) =>
      c.id === customerId ? { ...c, ...data } : c
    );
    lsSaveCustomers(all);
    return;
  }

  await updateDoc(doc(db, `salons/${salonId}/customers`, customerId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function saveCustomerPrivate(
  salonId: string,
  customerId: string,
  data: Partial<CustomerPrivate>
): Promise<void> {
  if (!db) return;
  await setDoc(
    privateDoc(salonId, customerId),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ── 접근 로그 기록 (non-blocking) ──────────────────────────────────────────

export function logCustomerAccess(
  salonId: string,
  action: string,
  customerId: string,
  user: { uid: string; name: string; role: PermissionRole }
): void {
  if (!db) return;
  addDoc(collection(db, `salons/${salonId}/accessLogs`), {
    userId: user.uid,
    userName: user.name,
    role: user.role,
    action,
    targetType: "customer",
    targetId: customerId,
    createdAt: serverTimestamp(),
  }).catch(() => {});
}
