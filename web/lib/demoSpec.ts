// DEMO 모드용 스토리라인 사양(API 키 없을 때 조립 경로 시연).
import type { StorylineSpec } from "./schema";

export function demoSpec(company: string, platform = "CAFE24"): StorylineSpec {
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
