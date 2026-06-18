import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "리터니즈 제안서 자동 생성",
  description: "회사명 + 홈페이지 URL만으로 리서치 → 페인포인트 → 스토리라인 → 제안서 초안까지 자동 완주",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
