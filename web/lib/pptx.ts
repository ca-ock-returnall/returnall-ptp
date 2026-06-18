// 스토리라인 사양 → PowerPoint(.pptx) 덱 생성. pptxgenjs 사용(Node 런타임).
// 고객사 판단(GEN) 슬라이드 + 리터니즈 고정 역량 수치 슬라이드로 구성.
import type { Lang } from "./i18n";
import PptxGenJS from "pptxgenjs";
import type { StorylineSpec } from "./schema";

// PPTX 슬라이드 고정 라벨(언어별).
const PL: Record<Lang, {
  author: string;
  core: string;
  kpiTitle: string;
  kpiHead: [string, string, string];
  roadmap: string;
  opsDetail: string;
  productMgmt: string;
  platformIntegration: (p: string) => string;
  platformBody: (p: string) => string;
  capability: string;
  stats: [string, string][];
  closing: string;
}> = {
  ko: {
    author: "리터니즈 제안서 자동 생성",
    core: "제안 핵심",
    kpiTitle: "부서별 가치 정렬 (KPI 언어 번역)",
    kpiHead: ["부서", "관심 KPI", "리터니즈 제안 메시지"],
    roadmap: "단계형 파일럿 실행 로드맵",
    opsDetail: "운영 상세 · 시스템 연동",
    productMgmt: "상품 관리 (Style vs SKU)",
    platformIntegration: (p) => `${p} 연동`,
    platformBody: (p) =>
      `${p} 및 주요 커머스 플랫폼 자동 주문 수집. 무연동/저연동 → 상태값 → 사진·검수 결과 순의 단계형 연동을 제안합니다.`,
    capability: "리터니즈 운영 역량",
    stats: [
      ["6,000건/일", "검수·처리 CAPA"],
      ["4,500건/일", "여유 처리량"],
      ["48시간", "반품 처리 리드타임"],
      ["99.99%", "검수 정확도"],
    ],
    closing: "반품, 끝까지 책임지는 운영 파트너",
  },
  en: {
    author: "Returneeds AI Proposal Builder",
    core: "Proposal essentials",
    kpiTitle: "Value alignment by team (KPI language translation)",
    kpiHead: ["Team", "KPI of interest", "Returneeds proposal message"],
    roadmap: "Phased pilot execution roadmap",
    opsDetail: "Operations detail · system integration",
    productMgmt: "Product management (Style vs SKU)",
    platformIntegration: (p) => `${p} integration`,
    platformBody: (p) =>
      `Automatic order collection from ${p} and major commerce platforms. We propose phased integration: no/low integration → status values → photos and inspection results.`,
    capability: "Returneeds operating capacity",
    stats: [
      ["6,000 units/day", "Inspection/processing CAPA"],
      ["4,500 units/day", "Spare throughput"],
      ["48 hours", "Returns processing lead time"],
      ["99.99%", "Inspection accuracy"],
    ],
    closing: "Returns, owned end-to-end by your operations partner",
  },
};

const C = {
  green: "18883B",
  greenD: "0F6E2E",
  greenL: "E9F5EC",
  orange: "F26F21",
  ink: "222629",
  ink2: "4B5158",
  gray: "6B7280",
  card: "F1F2F3",
  white: "FFFFFF",
};
// PPTX 본문 폰트. pptxgenjs는 폰트를 임베드하지 않으므로 여는 PC에 Pretendard가 설치돼
// 있어야 그대로 렌더된다(미설치 시 PowerPoint가 대체 폰트로 표시).
const FONT = "Pretendard";

function strip(s: string): string {
  return (s || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function buildPptx(spec: StorylineSpec, lang: Lang = "ko"): Promise<Buffer> {
  const t = PL[lang];
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
  pptx.layout = "WIDE";
  pptx.author = t.author;
  pptx.company = "returneeds";

  // 1) 커버
  let s = pptx.addSlide();
  s.background = { color: C.green };
  s.addText(strip(spec.proposal_title), { x: 0.8, y: 2.5, w: 11.7, h: 2.2, fontFace: FONT, fontSize: 36, bold: true, color: C.white, align: "center", valign: "middle" });
  s.addText(`${spec.company_en}   ×   returneeds`, { x: 0.8, y: 5.5, w: 11.7, h: 0.8, fontFace: FONT, fontSize: 20, color: "D9EFE0", align: "center", italic: true });

  // 2) 핵심 메시지
  s = pptx.addSlide();
  s.addShape("rect" as any, { x: 0.7, y: 0.75, w: 1.6, h: 0.12, fill: { color: C.ink } });
  s.addText(strip(spec.hero_headline), { x: 0.7, y: 0.95, w: 4.2, h: 2.2, fontFace: FONT, fontSize: 28, bold: true, color: C.green, valign: "top" });
  s.addText(spec.hero_lead, { x: 5.2, y: 0.95, w: 7.3, h: 4.5, fontFace: FONT, fontSize: 16, color: C.ink2, valign: "top", lineSpacingMultiple: 1.3 });

  // 3) 3카드 (고객 구조 / 핵심 과제 / 제안 방향)
  s = pptx.addSlide();
  s.addText(t.core, { x: 0.7, y: 0.5, w: 12, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: C.ink });
  const accents = [C.green, C.orange, "33373B"];
  spec.cards.slice(0, 3).forEach((c, i) => {
    const x = 0.7 + i * 4.1;
    s.addShape("rect" as any, { x, y: 1.5, w: 3.8, h: 5.2, fill: { color: C.card }, line: { color: "D7DADD", width: 0.5 } });
    s.addShape("rect" as any, { x, y: 1.5, w: 3.8, h: 0.12, fill: { color: accents[i] } });
    const runs: any[] = [
      { text: strip(c.tag), options: { bold: true, fontSize: 12, color: accents[i], breakLine: true, paraSpaceAfter: 4 } },
      { text: strip(c.title), options: { bold: true, fontSize: 16, color: C.ink, breakLine: true, paraSpaceAfter: 8 } },
      ...c.bullets.map((b) => ({ text: strip(b), options: { fontSize: 12, color: C.ink2, bullet: { code: "2713" }, breakLine: true, paraSpaceAfter: 4 } })),
    ];
    s.addText(runs, { x: x + 0.25, y: 1.85, w: 3.3, h: 4.0, valign: "top", fontFace: FONT });
    s.addText(strip(c.pill), { x: x + 0.25, y: 6.0, w: 3.3, h: 0.5, fontSize: 11, bold: true, color: C.greenD, fill: { color: C.greenL }, align: "center", fontFace: FONT });
  });

  // 4) 부서별 KPI 정렬
  s = pptx.addSlide();
  s.addText(t.kpiTitle, { x: 0.7, y: 0.5, w: 12, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: C.green });
  const head = t.kpiHead.map((label) => ({ text: label, options: { bold: true, color: C.white, fill: { color: C.green }, fontFace: FONT, fontSize: 13, valign: "middle" } }));
  const body = spec.kpi_rows.map((r) => [
    { text: strip(r.dept), options: { bold: true, color: C.ink, fill: { color: "F4F6F6" }, fontFace: FONT, fontSize: 12 } },
    { text: strip(r.kpi), options: { color: C.ink2, fontFace: FONT, fontSize: 12 } },
    { text: strip(r.message), options: { color: C.ink, fontFace: FONT, fontSize: 12, align: "left" } },
  ]);
  s.addTable([head, ...body] as any, { x: 0.5, y: 1.4, w: 12.3, colW: [2.4, 3.6, 6.3], border: { type: "solid", color: "E3E5E7", pt: 1 }, valign: "middle", rowH: 0.5, align: "center" });

  // 5) 단계형 파일럿 로드맵
  s = pptx.addSlide();
  s.addText(t.roadmap, { x: 0.7, y: 0.5, w: 12, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: C.green });
  spec.pilot_phases.slice(0, 3).forEach((p, i) => {
    const x = 0.7 + i * 4.1;
    s.addShape("roundRect" as any, { x, y: 1.6, w: 3.8, h: 1.9, fill: { color: C.white }, line: { color: C.green, width: 1 }, rectRadius: 0.1 });
    s.addText(
      [
        { text: strip(p.title), options: { bold: true, fontSize: 15, color: C.greenD, breakLine: true, paraSpaceAfter: 6 } },
        { text: strip(p.desc), options: { fontSize: 12, color: C.ink2 } },
      ] as any,
      { x: x + 0.25, y: 1.8, w: 3.3, h: 1.6, valign: "top", fontFace: FONT },
    );
  });
  s.addText(strip(spec.roadmap_note), { x: 0.7, y: 3.9, w: 11.9, h: 1.5, fontFace: FONT, fontSize: 13, color: C.ink2, valign: "top", lineSpacingMultiple: 1.3 });

  // 6) 운영 상세 (Style/SKU · 플랫폼 연동)
  s = pptx.addSlide();
  s.addText(t.opsDetail, { x: 0.7, y: 0.5, w: 12, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: C.green });
  s.addText(
    [
      { text: t.productMgmt, options: { bold: true, fontSize: 14, color: C.ink, breakLine: true, paraSpaceAfter: 4 } },
      { text: strip(spec.style_sku_lead), options: { fontSize: 13, color: C.ink2, breakLine: true, paraSpaceAfter: 3 } },
      { text: strip(spec.style_sku_note), options: { fontSize: 13, color: C.greenD, breakLine: true } },
    ] as any,
    { x: 0.7, y: 1.5, w: 11.9, h: 2.2, valign: "top", fontFace: FONT },
  );
  s.addText(
    [
      { text: t.platformIntegration(strip(spec.platform)), options: { bold: true, fontSize: 14, color: C.ink, breakLine: true, paraSpaceAfter: 4 } },
      { text: t.platformBody(strip(spec.platform)), options: { fontSize: 13, color: C.ink2 } },
    ] as any,
    { x: 0.7, y: 3.9, w: 11.9, h: 2.0, valign: "top", fontFace: FONT },
  );

  // 7) 리터니즈 운영 역량 (고정 수치)
  s = pptx.addSlide();
  s.addText(t.capability, { x: 0.7, y: 0.5, w: 12, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: C.green });
  const stats = t.stats;
  stats.forEach((st, i) => {
    const x = 0.7 + (i % 2) * 6.1;
    const y = 1.7 + Math.floor(i / 2) * 2.4;
    s.addShape("rect" as any, { x, y, w: 5.8, h: 2.1, fill: { color: C.greenL } });
    s.addText(st[0], { x: x + 0.3, y: y + 0.3, w: 5.2, h: 1.0, fontFace: FONT, fontSize: 40, bold: true, color: C.greenD });
    s.addText(st[1], { x: x + 0.3, y: y + 1.35, w: 5.2, h: 0.5, fontFace: FONT, fontSize: 14, color: C.ink2 });
  });

  // 8) 클로징
  s = pptx.addSlide();
  s.background = { color: C.green };
  s.addText(t.closing, { x: 0.8, y: 2.4, w: 11.7, h: 1.2, fontFace: FONT, fontSize: 30, bold: true, color: C.white, align: "center" });
  s.addText("returneeds", { x: 0.8, y: 4.0, w: 11.7, h: 0.8, fontFace: FONT, fontSize: 26, italic: true, bold: true, color: "D9EFE0", align: "center" });

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}
