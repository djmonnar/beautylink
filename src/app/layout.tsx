import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

const BASE_URL = "https://beautylink-rgxwq7p0u-djmonnar4-3362s-projects.vercel.app";

export const metadata: Metadata = {
  title: "뷰티링크 - 미용실 예약관리 CRM",
  description: "네이버예약·전화예약·방문예약을 한 화면에서 통합 관리하는 뷰티샵 전용 CRM. 디자이너별 예약 캘린더, 고객 방문 이력, 시술 메모까지 한 곳에서.",
  metadataBase: new URL(BASE_URL),
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "뷰티링크 - 미용실 예약관리 CRM",
    description: "네이버예약·전화예약·방문예약을 한 화면에서 통합 관리하는 뷰티샵 전용 CRM",
    url: BASE_URL,
    siteName: "뷰티링크",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "뷰티링크 - 미용실 예약관리 CRM",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "뷰티링크 - 미용실 예약관리 CRM",
    description: "네이버예약·전화예약·방문예약을 한 화면에서 통합 관리하는 뷰티샵 전용 CRM",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
