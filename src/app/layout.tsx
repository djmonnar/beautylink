import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "뷰티링크 - 미용실 예약관리 CRM",
  description: "네이버예약·전화예약·방문예약을 한 화면에서 통합 관리하는 뷰티샵 전용 CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
