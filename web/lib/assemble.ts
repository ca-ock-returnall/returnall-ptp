// STAGE 4 — 스토리라인 사양으로 검증된 템플릿에 토큰을 채워 제안서 HTML을 조립한다.
// content-library/proposal-template.html 의 {{TOKEN}} 을 결정론적으로 치환한다.
// LIB(검증 자산) 슬라이드는 회사명/플랫폼 토큰 외에는 손대지 않는다.
import { loadTemplate } from "./config";
import type { StorylineSpec } from "./schema";

// 텍스트 토큰 이스케이프(& < > 만). message 필드의 <b> 강조는 의도적으로 허용한다.
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function kpiRows(spec: StorylineSpec): string {
  return spec.kpi_rows
    .map(
      (r) =>
        `<tr><td class="lab">${esc(r.dept)}</td><td>${esc(r.kpi)}</td><td class="msg">${r.message}</td></tr>`,
    )
    .join("\n          ");
}

function roadmapTop(spec: StorylineSpec): string {
  return spec.pilot_phases
    .map((p) => `<div class="rt"><b class="g">${esc(p.title)}</b><span>${esc(p.desc)}</span></div>`)
    .join("\n          ");
}

function checklist(spec: StorylineSpec): string {
  return spec.checklist
    .map(
      (c) =>
        `<div class="chk"><div class="ic">✓</div><b>${esc(c.label)}</b><span>${esc(c.desc)}</span></div>`,
    )
    .join("\n        ");
}

export function assemble(spec: StorylineSpec): string {
  let html = loadTemplate();
  const c = spec.cards;
  const tokens: Record<string, string> = {
    PROPOSAL_TITLE: esc(spec.proposal_title),
    COMPANY: esc(spec.company),
    COMPANY_EN: esc(spec.company_en),
    PLATFORM: esc(spec.platform),
    SRC_FOOT: esc(spec.src_foot),
    HERO_HEADLINE: spec.hero_headline, // <br> 허용
    HERO_LEAD: esc(spec.hero_lead),
    CARD1_TAG: esc(c[0].tag), CARD1_TITLE: esc(c[0].title),
    CARD1_B1: esc(c[0].bullets[0]), CARD1_B2: esc(c[0].bullets[1]),
    CARD1_B3: esc(c[0].bullets[2]), CARD1_PILL: esc(c[0].pill),
    CARD2_TAG: esc(c[1].tag), CARD2_TITLE: esc(c[1].title),
    CARD2_B1: esc(c[1].bullets[0]), CARD2_B2: esc(c[1].bullets[1]),
    CARD2_B3: esc(c[1].bullets[2]), CARD2_PILL: esc(c[1].pill),
    CARD3_TAG: esc(c[2].tag), CARD3_TITLE: esc(c[2].title),
    CARD3_B1: esc(c[2].bullets[0]), CARD3_B2: esc(c[2].bullets[1]),
    CARD3_B3: esc(c[2].bullets[2]), CARD3_PILL: esc(c[2].pill),
    STYLE_SKU_LEAD: esc(spec.style_sku_lead),
    STYLE_SKU_NOTE: esc(spec.style_sku_note),
    ROADMAP_NOTE: esc(spec.roadmap_note),
    KPI_ROWS: kpiRows(spec),
    ROADMAP_TOP: roadmapTop(spec),
    CHECKLIST_ITEMS: checklist(spec),
  };
  for (const [key, val] of Object.entries(tokens)) {
    html = html.split(`{{${key}}}`).join(val);
  }
  const leftover = html.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (leftover) {
    throw new Error(`미치환 토큰 잔존: ${[...new Set(leftover)].sort().join(", ")}`);
  }
  return html;
}
