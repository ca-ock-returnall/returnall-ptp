/**
 * 의존성 없는 스모크 테스트 (plain node).
 *
 * lib/assemble.ts + lib/demoSpec.ts 의 로직을 그대로 인라인해, 실제 템플릿에 대해
 *   - 미치환 토큰 0개
 *   - class="slide 23개
 * 를 검증한다. (npm install 없이 동작)
 *
 * npm/tsx 가 가능한 환경에서는 `npx tsx scripts/smoke.ts` 를 권장(같은 결과).
 * 실행: node scripts/smoke.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const TEMPLATE_PATH = path.join(ROOT, "content-library", "proposal-template.html");

// ── assemble.ts 인라인 (바이트 동등) ──
const TOKEN_RE = /\{\{[A-Z0-9_]+\}\}/g;

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function cardBullets(bullets) {
  return bullets.map((b) => `<li>${esc(b)}</li>`).join("");
}
function kpiRows(rows) {
  return rows
    .map(
      (r) =>
        `<tr><td class='dept'>${esc(r.dept)}</td>` +
        `<td class='kpi'>${esc(r.kpi)}</td>` +
        `<td>${r.message}</td></tr>`
    )
    .join("");
}
function roadmapTop(phases) {
  const barClasses = ["bar", "bar p2", "bar p3"];
  const labels = ["기준 정렬", "파일럿 운영", "검증 · 확장"];
  return phases
    .map((p, i) => {
      const cls = i < barClasses.length ? barClasses[i] : "bar";
      const phaseLabel = i < labels.length ? labels[i] : `단계 ${i + 1}`;
      return (
        `<div class='grow'>` +
        `<div class='lab'>${esc(p.title)}<span>${esc(phaseLabel)}</span></div>` +
        `<div class='${cls}'>${esc(p.desc)}</div>` +
        `</div>`
      );
    })
    .join("");
}
function checklist(items) {
  return items
    .map(
      (it) =>
        `<div class='chk'><div class='box'></div>` +
        `<div><div class='t'>${esc(it.label)}</div>` +
        `<div class='d'>${esc(it.desc)}</div></div></div>`
    )
    .join("");
}
function buildTokens(spec) {
  const tokens = {
    COMPANY: esc(spec.company),
    COMPANY_EN: esc(spec.company_en),
    PLATFORM: esc(spec.platform),
    PROPOSAL_TITLE: esc(spec.proposal_title),
    SRC_FOOT: esc(spec.src_foot),
    HERO_HEADLINE: spec.hero_headline,
    HERO_LEAD: esc(spec.hero_lead),
    STYLE_SKU_LEAD: esc(spec.style_sku_lead),
    STYLE_SKU_NOTE: esc(spec.style_sku_note),
    KPI_ROWS: kpiRows(spec.kpi_rows),
    ROADMAP_TOP: roadmapTop(spec.pilot_phases),
    ROADMAP_NOTE: esc(spec.roadmap_note),
    CHECKLIST_ITEMS: checklist(spec.checklist),
  };
  spec.cards.forEach((card, idx) => {
    const i = idx + 1;
    tokens[`CARD${i}_TAG`] = esc(card.tag);
    tokens[`CARD${i}_TITLE`] = esc(card.title);
    tokens[`CARD${i}_BULLETS`] = cardBullets(card.bullets);
    tokens[`CARD${i}_PILL`] = esc(card.pill);
  });
  return tokens;
}
function assemble(spec, template) {
  let tpl = template;
  const tokens = buildTokens(spec);
  for (const [key, val] of Object.entries(tokens)) {
    tpl = tpl.split("{{" + key + "}}").join(val);
  }
  const leftovers = Array.from(new Set(tpl.match(TOKEN_RE) || [])).sort();
  if (leftovers.length > 0) {
    throw new Error(`미치환 토큰이 남았습니다: ${leftovers.join(", ")}`);
  }
  return tpl;
}

// ── demoSpec.ts 인라인 (동일 값) ──
const DEMO_SPEC = {
  proposal_title: "반품 운영 효율화 제안서",
  company: "안다르",
  company_en: "ANDAR",
  platform: "자체몰 · CAFE24",
  hero_headline: "안다르의 반품을<br>다시 파는 재고로 되돌립니다",
  hero_lead:
    "애슬레저 특성상 사이즈·핏 교환과 반품이 반복됩니다. 리터니즈가 입고·검수·재고복원·재판매를 한 라인으로 운영해, 반품 손실률과 처리 리드타임을 동시에 낮춥니다.",
  cards: [
    {
      tag: "고객 구조",
      title: "자체몰 중심 D2C, 높은 교환·반품 비중",
      bullets: [
        "[사실] 자체몰·CAFE24 기반 D2C 판매 구조",
        "[추정] 레깅스·애슬레저 핏 민감도로 교환·반품 반복",
        "[추정] 시즌 신상 회전이 빨라 반품 재고화 압박",
      ],
      pill: "핏 민감 카테고리",
    },
    {
      tag: "핵심 과제",
      title: "반품 적체와 재고 묶임, 회수 가치 손실",
      bullets: [
        "[추정] 반품 검수 지연 시 정상 재고 복원 지연",
        "[추정] 폐기·이월 비중이 회수 가치 손실로 직결",
        "[추정] 검수 기준 편차로 CS·재고 데이터 불일치",
      ],
      pill: "데이터 확인 후 확정",
    },
    {
      tag: "제안 방향",
      title: "48시간 재고복원 + 등급별 재판매 분기",
      bullets: [
        "[사실] 입고→재고복원 48시간 SLA 표준",
        "[사실] 검수정확도 99.99%로 등급 판정 일원화",
        "[제안] 리퍼·아울렛 채널로 회수 가치 전환",
      ],
      pill: "파일럿으로 검증",
    },
  ],
  style_sku_lead:
    "레깅스·애슬레저 의류는 착용 흔적·핏 변형·세탁 상태에 따라 양품/리퍼/불량 경계가 미묘합니다. 색상·사이즈 SKU가 많아 복원 시 정확한 재입고 매핑이 중요합니다.",
  style_sku_note:
    "안다르 상품군에 맞춘 검수 체크리스트(핏 변형·보풀·세탁 상태)를 표준화하고, SKU 단위로 재입고 라우팅을 설계합니다. 구체 SKU 분포·반품 사유 비중은 데이터 확인 후 확정합니다.",
  kpi_rows: [
    { dept: "물류/운영", kpi: "재고복원 리드타임", message: "입고→복원 <b class='g'>48시간</b> SLA로 적체 해소" },
    { dept: "재고기획", kpi: "가용 재고 회복", message: "양품 <b>즉시 재고 복원</b>으로 판매 기회 손실 최소화" },
    { dept: "CS", kpi: "반품 처리 일관성", message: "<b class='g'>99.99%</b> 검수 정확도로 분쟁·재문의 감소" },
    { dept: "재무", kpi: "회수 가치", message: "폐기 대신 <b class='o'>리퍼·재판매</b>로 손실을 매출로 전환" },
    { dept: "마케팅/MD", kpi: "시즌 재고 회전", message: "피크 반품을 여유 CAPA <b>4,500건/일</b>로 흡수" },
    { dept: "경영", kpi: "운영비 예측성", message: "처리 <b>건당 정산</b>으로 예측 가능한 비용 구조" },
  ],
  pilot_phases: [
    { title: "기준 정렬", desc: "안다르 검수 기준·SKU 매핑·데이터 연동 정의 (2주)" },
    { title: "파일럿 운영", desc: "단일 카테고리 반품을 48시간 SLA로 시범 운영 (4주)" },
    { title: "검증 · 확장", desc: "회수율·리드타임 지표 검증 후 전 카테고리 확장 (이후)" },
  ],
  roadmap_note:
    "파일럿 기간·물량은 안다르 데이터 확인 후 확정합니다. 리드타임 48시간·검수정확도 99.99%는 리터니즈 운영 기준값입니다.",
  checklist: [
    { label: "대상 카테고리", desc: "파일럿 시작 카테고리(예: 레깅스 라인) 선정" },
    { label: "반품 물량 데이터", desc: "월 반품 건수·사유 분포 공유 (데이터 확인 후 확정)" },
    { label: "플랫폼 연동", desc: "자체몰·CAFE24 주문/재고 API 연동 범위 확정" },
    { label: "검수 기준", desc: "양품/리퍼/불량 등급 기준 합의" },
    { label: "재판매 채널", desc: "리퍼·아울렛 재판매 채널 정책 확정" },
    { label: "정산 방식", desc: "처리 건당 단가·정산 주기 합의" },
  ],
  src_foot: "출처: 안다르 공식몰·공개자료 기반 [추정] 포함 · 리터니즈 운영 기준값(고정)",
};

// ── run ──
const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
const html = assemble(DEMO_SPEC, template);
const leftovers = html.match(TOKEN_RE) || [];
const slides = html.match(/class="slide/g) || [];

console.log(`leftover tokens: ${leftovers.length}`);
console.log(`'class="slide' occurrences: ${slides.length}`);

let ok = true;
if (leftovers.length !== 0) {
  console.error(`FAIL: 미치환 토큰 ${leftovers.length}개`);
  ok = false;
}
if (slides.length !== 23) {
  console.error(`FAIL: class="slide" 개수가 23이 아님 (${slides.length})`);
  ok = false;
}
if (!ok) process.exit(1);
console.log('SMOKE OK: 0 leftover tokens, 23 occurrences of class="slide".');
