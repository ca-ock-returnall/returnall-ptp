import type { Metadata } from "next";
import "./globals.css";

// 정적 메타데이터는 이중 언어로 둔다(실제 문서 lang/제목 갱신은 useLang 가 클라이언트에서 처리).
export const metadata: Metadata = {
  title: "리터니즈 제안서 자동 생성 · Returneeds AI Proposal Builder",
  description:
    "회사명 + 홈페이지 URL만으로 리서치 → 페인포인트 → 스토리라인 → 제안서 초안까지 자동 완주 / " +
    "From a company name and homepage URL to research, pain-points, storyline, and a proposal draft — end to end.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
