"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  AuthError,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, isConfigured } from "@/lib/firebase";
import type { UserRole } from "@/types";

export type { UserRole };

export interface UserData {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  salonId: string;
  designerId?: string;
  isActive: boolean;
}

interface AuthContextValue {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  firebaseReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user: null,
  userData: null,
  loading: true,
  firebaseReady: false,
  login: async () => {},
  logout: async () => {},
});

// ─── Provider ───────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase 미설정 시 즉시 로딩 완료 처리 (데모 모드)
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser && db) {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            setUserData(snap.data() as UserData);
          } else {
            // users 문서가 없으면 기본값 (onboarding 미완료)
            setUserData(null);
          }
        } catch {
          setUserData(null);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── 로그인 ──────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase가 설정되지 않았습니다.");
    await signInWithEmailAndPassword(auth, email, password);
  };

  // ── 로그아웃 ─────────────────────────────────────────────
  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        firebaseReady: isConfigured,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────
export function useAuth() {
  return useContext(AuthContext);
}

// ─── Firebase 에러 → 한국어 메시지 ──────────────────────────
export function getAuthErrorMessage(error: unknown): string {
  const code = (error as AuthError)?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-email": "이메일 형식이 올바르지 않습니다.",
    "auth/user-not-found": "등록되지 않은 이메일입니다.",
    "auth/wrong-password": "비밀번호가 올바르지 않습니다.",
    "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "auth/too-many-requests": "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
    "auth/user-disabled": "비활성화된 계정입니다. 관리자에게 문의하세요.",
    "auth/network-request-failed": "네트워크 오류가 발생했습니다.",
  };
  return map[code] ?? "로그인에 실패했습니다. 다시 시도해주세요.";
}
