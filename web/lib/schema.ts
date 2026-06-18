// STAGE 3 산출물 스토리라인 사양(STORYLINE SPEC)의 구조화 스키마.
// pipeline/stage3_storyline.md 의 '▶ STORYLINE SPEC' 블록을 타입화한 것.
// STAGE 4(assemble.ts)는 이 객체만으로 제안서 HTML을 결정론적으로 조립한다.
// SDK의 zodOutputFormat 헬퍼가 zod/v4 API를 쓰므로 동일 엔트리포인트로 스키마를 정의한다.
import { z } from "zod/v4";

export const CardSchema = z.object({
  tag: z.string().describe("카드 상단 태그(예: 고객 구조 / 핵심 과제 / 제안 방향)"),
  title: z.string().describe("카드 제목 한 줄"),
  bullets: z.array(z.string()).length(3).describe("불릿 3개"),
  pill: z.string().describe("하단 강조 pill 문구"),
});

export const KpiRowSchema = z.object({
  dept: z.string().describe("부서"),
  kpi: z.string().describe("그 부서의 관심 KPI"),
  message: z.string().describe("리터니즈 제안 메시지. <b>·<b class='g'>·<b class='o'> 강조 HTML 허용"),
});

export const PhaseSchema = z.object({
  title: z.string().describe("단계명+기간(예: '기준 정렬 (1~2주)')"),
  desc: z.string().describe("그 단계에서 하는 일 한 줄"),
});

export const ChecklistItemSchema = z.object({
  label: z.string().describe("확인 항목 제목(짧게)"),
  desc: z.string().describe("요청 데이터/기준 설명"),
});

export const StorylineSpecSchema = z.object({
  proposal_title: z.string().describe("표지 제목(예: '안다르 B2C 반품 운영 모델 제안')"),
  company: z.string().describe("회사명"),
  company_en: z.string().describe("로고용 영문명. 없으면 회사명 그대로"),
  platform: z.string().describe("커머스 플랫폼(예: CAFE24 / 자체몰 / 스마트스토어)"),
  hero_headline: z.string().describe("'왜 지금 X인가' 한 줄. <br> 허용"),
  hero_lead: z.string().describe("표지 다음 핵심 메시지 2~3문장"),
  cards: z.array(CardSchema).length(3).describe("3카드: 고객 구조 / 핵심 과제 / 제안 방향"),
  style_sku_lead: z.string().describe("Style vs SKU 슬라이드 리드 문장"),
  style_sku_note: z.string().describe("SKU 단위 우려 반영 권장안 한 줄"),
  kpi_rows: z.array(KpiRowSchema).min(5).max(7).describe("부서별 KPI 정렬 5~7행"),
  pilot_phases: z.array(PhaseSchema).length(3).describe("단계형 파일럿 3단계"),
  roadmap_note: z.string().describe("로드맵 하단 노트: 확인 필요 데이터 + 후속 확장"),
  checklist: z.array(ChecklistItemSchema).length(6).describe("실행 확인 요청 6항목"),
  src_foot: z.string().describe("슬라이드3 하단 근거 출처 한 줄"),
});

export type StorylineSpec = z.infer<typeof StorylineSpecSchema>;
