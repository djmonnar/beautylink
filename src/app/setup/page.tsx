"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { seedFirestore, checkSeedStatus } from "@/lib/seedData";
import { CheckCircle, Database, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import Image from "next/image";

export default function SetupPage() {
  const { user, userData, loading, firebaseReady } = useAuth();
  const router = useRouter();

  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; details: string[] } | null>(null);
  const [alreadySeeded, setAlreadySeeded] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    checkSeedStatus().then(setAlreadySeeded);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!firebaseReady) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">Firebase가 설정되지 않았습니다.</p>
          <p className="text-sm text-gray-500 mt-1">.env.local 파일을 확인해주세요.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle size={40} className="text-orange-500 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">로그인이 필요합니다.</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  async function handleSeed() {
    if (!user) return;
    setSeeding(true);
    const name = userName.trim() || user.email?.split("@")[0] || "원장님";
    const res = await seedFirestore(user.uid, user.email ?? "", name);
    setResult(res);
    setSeeding(false);
    if (res.ok) setAlreadySeeded(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/logo-horizontal.png" alt="뷰티링크" width={140} height={37} className="object-contain" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">초기 데이터 세팅</h1>
              <p className="text-sm text-gray-500">Firestore에 샘플 데이터를 등록합니다</p>
            </div>
          </div>

          {/* Current user info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">로그인된 계정</p>
            <p className="text-sm font-medium text-gray-900">{user.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">UID: {user.uid}</p>
          </div>

          {/* Already seeded */}
          {alreadySeeded && !result && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">이미 데이터가 존재합니다</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  다시 실행하면 기존 데이터를 덮어씁니다.
                </p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`rounded-xl p-4 mb-6 ${result.ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <p className={`text-sm font-semibold mb-3 ${result.ok ? "text-green-800" : "text-red-800"}`}>
                {result.message}
              </p>
              <div className="space-y-1">
                {result.details.map((d, i) => (
                  <p key={i} className={`text-xs ${result.ok ? "text-green-700" : "text-red-700"}`}>{d}</p>
                ))}
              </div>
            </div>
          )}

          {/* Name input */}
          {!result?.ok && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                관리자 이름 (원장님 이름)
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={user.email?.split("@")[0] ?? "원장님"}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">비워두면 이메일 앞부분이 사용됩니다.</p>
            </div>
          )}

          {/* What will be seeded */}
          {!result?.ok && (
            <div className="mb-6">
              <p className="text-xs font-medium text-gray-500 mb-2">생성될 데이터</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "매장 정보", value: "1개" },
                  { label: "디자이너", value: "4명" },
                  { label: "시술 메뉴", value: "9개" },
                  { label: "샘플 고객", value: "6명" },
                  { label: "샘플 예약", value: "10건" },
                  { label: "관리자 계정", value: "1개" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <CheckCircle size={13} className="text-blue-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600">{item.label}</span>
                    <span className="text-xs font-semibold text-gray-900 ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          {!result?.ok ? (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {seeding ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Firestore에 데이터 저장 중...
                </>
              ) : (
                <>
                  <Database size={16} />
                  {alreadySeeded ? "데이터 다시 세팅하기" : "Firestore 초기 세팅 시작"}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              대시보드로 이동
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          이 페이지는 초기 설정 전용입니다. 실제 운영 중에는 접근하지 마세요.
        </p>
      </div>
    </div>
  );
}
