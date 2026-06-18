// DEMO 모드용 스토리라인 사양(API 키 없을 때 조립 경로 시연).
import type { Lang } from "./i18n";
import type { StorylineSpec } from "./schema";

export function demoSpec(company: string, lang: Lang = "ko", platform = "CAFE24"): StorylineSpec {
  if (lang === "en") return demoSpecEn(company, platform);
  return {
    proposal_title: `${company} B2C 반품 운영 모델 제안`,
    company,
    company_en: company,
    platform,
    hero_headline: "왜 지금<br>반품 운영인가",
    hero_lead:
      "반품 증가는 검수 지연·환불 지연·CS 부하·재구매율 압박으로 이어지는 연결된 구조입니다. " +
      "리터니즈는 검수·양품화 병목만 분리해 브랜드 기준을 보존하며 리드타임을 개선합니다.",
    cards: [
      {
        tag: "고객 구조",
        title: "프리미엄 품질 중심 D2C",
        bullets: ["자체몰·주요 채널 동시 운영", "품질·브랜드 신뢰가 핵심 KPI", "반품 검수 기준이 까다로움"],
        pill: "양품화/기준 보존형",
      },
      {
        tag: "핵심 과제",
        title: "반품 병목의 연쇄",
        bullets: ["검수 TAT 지연 → 환불 지연", "CS 재문의·분쟁 증가", "재고 복귀 지연으로 판매 손실"],
        pill: "구조적 병목",
      },
      {
        tag: "제안 방향",
        title: "좁은 범위 파일럿",
        bullets: ["상위 카테고리 B2C 반품만", "기존 3PL 비충돌", "수치 증명형 단계 확장"],
        pill: "저부담 시작",
      },
    ],
    style_sku_lead: "현재 재입고 단위(Style/SKU)에 대한 우려를 반영해 단계형 분류를 제안합니다.",
    style_sku_note: "초기에는 Style 기준 반환으로 즉시 적용, 정합성 검증 후 SKU 세부로 확장 권장.",
    kpi_rows: [
      { dept: "경영진", kpi: "매출 성장·브랜드 신뢰", message: "반품 운영 안정화는 <b class='g'>성장 인프라 보강</b>입니다." },
      { dept: "물류/SCM", kpi: "CAPA·운임·3PL 충돌", message: "전면 위탁이 아니라 <b>검수·양품화 병목만 분리</b>합니다." },
      { dept: "CS", kpi: "환불 문의·재문의율", message: "검수 사진·상태값으로 <b class='o'>응답 시간·분쟁</b>을 줄입니다." },
      { dept: "품질/QC", kpi: "판정 기준·오차율", message: `${company} 기준을 흡수하고 <b class='g'>초기 2주 이중검수</b>로 관리합니다.` },
      { dept: "MD/CRM", kpi: "환불율·재구매율", message: "반품 데이터가 <b>SKU별 환불율·재구매 방어</b>로 연결됩니다." },
    ],
    pilot_phases: [
      { title: "기준 정렬 (1~2주)", desc: "검수 기준표·양품화 매뉴얼 수령, 판정 코드·사진 규격 합의" },
      { title: "파일럿 운영 (3~6주)", desc: "상위 카테고리 실물 검수·양품화, 초기 2주 이중검수" },
      { title: "검증·확장 (7~8주)", desc: "SLA·오차율·재고복귀 리포트, 상태값 연동 검토" },
    ],
    roadmap_note: "확인 필요: 최근 12개월 반품량·단계별 리드타임. 후속: 글로벌/오프라인 반품 확장 검토.",
    checklist: [
      { label: "반품량 데이터", desc: "최근 12개월 B2C 반품량 — 월평균·피크월·일평균·피크일" },
      { label: "처리 리드타임", desc: "접수→회수→입고→검수→환불→재고복귀 단계별 소요 시간" },
      { label: "검수 기준·매뉴얼", desc: `${company} 검수 기준표·양품화 허용 범위·사진 촬영 기준` },
      { label: "재입고 단위", desc: "Style / Style+사이즈 / SKU 중 실제 재입고 기준" },
      { label: "시스템 구간", desc: `${platform}·WMS·3PL 사이 수기 처리 구간, CS 필수 조회 정보` },
      { label: "승인 기준", desc: "CAPA·단가·검수 정확도·연동·보안 중 우선순위" },
    ],
    src_foot: "공개자료 리서치 및 워크드 분석 기반 (DEMO).",
  };
}

// 영어 DEMO 사양(영어 템플릿과 조합해 영문 제안서 시연).
function demoSpecEn(company: string, platform: string): StorylineSpec {
  return {
    proposal_title: `${company} B2C Returns Operations Model Proposal`,
    company,
    company_en: company,
    platform,
    hero_headline: "Why returns<br>operations, now",
    hero_lead:
      "Rising returns create a connected chain of inspection delays, refund delays, CS load, and pressure on repurchase rates. " +
      "Returneeds isolates only the inspection/refurbishment bottleneck, preserving brand standards while improving lead time.",
    cards: [
      {
        tag: "Customer profile",
        title: "Premium, quality-driven D2C",
        bullets: ["Runs own mall and major channels in parallel", "Quality and brand trust are core KPIs", "Strict returns-inspection standards"],
        pill: "Refurbishment / standard-preserving",
      },
      {
        tag: "Core challenge",
        title: "A chain of returns bottlenecks",
        bullets: ["Inspection TAT delay → refund delay", "More CS re-inquiries and disputes", "Lost sales from delayed restock"],
        pill: "Structural bottleneck",
      },
      {
        tag: "Proposed direction",
        title: "A narrow-scope pilot",
        bullets: ["Top-category B2C returns only", "No conflict with existing 3PL", "Evidence-driven phased expansion"],
        pill: "Low-burden start",
      },
    ],
    style_sku_lead: "Reflecting concerns about the current restock unit (Style/SKU), we propose phased classification.",
    style_sku_note: "Start with Style-level returns for immediate rollout, then expand to SKU detail after consistency is verified.",
    kpi_rows: [
      { dept: "Executives", kpi: "Revenue growth · brand trust", message: "Stabilizing returns operations is <b class='g'>reinforcing growth infrastructure</b>." },
      { dept: "Logistics/SCM", kpi: "Capacity · freight · 3PL conflict", message: "Not full outsourcing — we <b>isolate only the inspection/refurbishment bottleneck</b>." },
      { dept: "CS", kpi: "Refund inquiries · re-inquiry rate", message: "Inspection photos and status data cut <b class='o'>response time and disputes</b>." },
      { dept: "Quality/QC", kpi: "Judgment criteria · error rate", message: `We absorb ${company}'s standards and manage with <b class='g'>dual inspection in the first 2 weeks</b>.` },
      { dept: "MD/CRM", kpi: "Refund rate · repurchase rate", message: "Returns data connects to <b>per-SKU refund rates and repurchase defense</b>." },
    ],
    pilot_phases: [
      { title: "Standards alignment (1–2 weeks)", desc: "Receive inspection criteria and refurbishment manual; agree on judgment codes and photo specs" },
      { title: "Pilot operation (3–6 weeks)", desc: "Physical inspection and refurbishment of top categories; dual inspection for the first 2 weeks" },
      { title: "Validation & expansion (7–8 weeks)", desc: "Report SLA, error rate, restock time; review status-data integration" },
    ],
    roadmap_note: "To confirm: last 12 months of returns volume and per-stage lead time. Next: review global/offline returns expansion.",
    checklist: [
      { label: "Returns volume data", desc: "Last 12 months of B2C returns — monthly avg, peak month, daily avg, peak day" },
      { label: "Processing lead time", desc: "Time per stage: intake → pickup → inbound → inspection → refund → restock" },
      { label: "Inspection criteria/manual", desc: `${company} inspection criteria, refurbishment tolerance, photo standards` },
      { label: "Restock unit", desc: "Which is the actual restock basis: Style / Style+size / SKU" },
      { label: "System segments", desc: `Manual-handling gaps between ${platform}, WMS, and 3PL; info CS must look up` },
      { label: "Approval criteria", desc: "Priorities among capacity, unit price, inspection accuracy, integration, security" },
    ],
    src_foot: "Based on public-source research and worked analysis (DEMO).",
  };
}
