// 4단계 오케스트레이터: 회사명+URL → 리서치 → 페인포인트 → 스토리라인 → 제안서 조립.
// pipeline/stage1~4 지침을 시스템 프롬프트로 사용한다. Claude 응답은 토큰 단위로 스트리밍한다.
// API 키가 없으면 rawdata/안다르 워크드 산출물로 DEMO 진행(조립 경로까지 실제 동작 + 스트리밍 시연).
import fs from "node:fs";
import path from "node:path";
import { assemble } from "./assemble";
import { HAS_API_KEY, OUTPUT_DIR, RAWDATA_DIR, loadStagePrompt } from "./config";
import { demoSpec } from "./demoSpec";
import type { Job } from "./jobs";
import { type LlmCtx, makeClient, parseStoryline, streamText } from "./llm";
import { buildPptx } from "./pptx";
import type { StorylineSpec } from "./schema";
import { crawlSite } from "./searchbot";
import * as sessions from "./sessions";

// 작업 상태를 서버 세션 레코드로 직렬화.
function toRecord(job: Job): sessions.SessionRecord {
  return {
    id: job.id,
    company: job.company,
    url: job.url,
    createdAt: job.createdAt,
    finishedAt: job.status === "running" ? undefined : Date.now(),
    status: job.status,
    error: job.error,
    model: job.demo ? "demo" : job.model,
    effort: job.effort,
    demo: job.demo,
    hadNotes: job.hadNotes,
    attached: job.attached,
    skipped: job.skipped,
    stage: job.stage,
    pages: job.pages,
    keypoints: job.keypoints,
    artifacts: job.artifacts,
    proposalName: job.proposalKey,
  };
}

// 진행 이벤트를 받아 job 진행상태를 갱신하고 세션 파일에 영속화한다(라이브·데모 공용).
function trackPersist(job: Job): () => void {
  return job.subscribe((ev) => {
    if (ev.kind === "stage_start") job.stage = ev.stage as number;
    else if (ev.kind === "search" && ev.type === "page") {
      job.pages.push({ url: ev.url as string, title: ev.title as string, chars: ev.chars as number, ok: ev.ok as boolean });
    } else if (ev.kind === "keypoints") {
      job.keypoints = ev.items as { label: string; value: string }[];
    } else if (ev.kind === "stage_done") {
      job.stage = ev.stage as number;
      sessions.patch(job.id, { stage: job.stage, artifacts: job.artifacts, pages: job.pages, keypoints: job.keypoints, proposalName: job.proposalKey });
    }
  });
}

// 구조화된 스토리라인 사양에서 '주요 포인트'를 추려 우측 패널용 이벤트로 내보낸다(추가 LLM 호출 없음).
function emitKeypoints(job: Job, spec: StorylineSpec): void {
  const items = [
    { label: "제안 제목", value: spec.proposal_title },
    { label: "커머스 플랫폼", value: spec.platform },
    { label: "핵심 메시지", value: spec.hero_headline.replace(/<br\s*\/?>/gi, " ") },
    { label: "고객 구조", value: spec.cards[0]?.title ?? "" },
    { label: "핵심 과제", value: spec.cards[1]?.title ?? "" },
    { label: "제안 방향", value: spec.cards[2]?.title ?? "" },
    { label: "1순위 파일럿", value: spec.pilot_phases[0]?.title ?? "" },
    { label: "부서별 KPI", value: spec.kpi_rows.map((r) => r.dept).join(", ") },
  ].filter((x) => x.value);
  job.emit({ kind: "keypoints", items });
}

function writeProposal(company: string, html: string): string {
  const outDir = path.join(OUTPUT_DIR, company);
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `${company}_제안서.html`);
  fs.writeFileSync(filePath, html, "utf-8");
  return filePath;
}

// STAGE 4 — HTML 조립 + PowerPoint 생성 + 파일 저장 (live·demo 공용).
async function assembleStage(job: Job, company: string, spec: StorylineSpec): Promise<void> {
  job.emit({ kind: "stage_start", stage: 4, title: "제안서 초안 조립" });
  const html = assemble(spec);
  writeProposal(company, html);
  job.artifacts[`${company}_제안서.html`] = html;
  job.proposalKey = `${company}_제안서.html`;

  job.emit({ kind: "substatus", stage: 4, text: "PowerPoint(.pptx) 생성 중…" });
  const buf = await buildPptx(spec);
  job.pptx = buf;
  job.pptxName = `${company}_제안서.pptx`;
  try {
    fs.writeFileSync(path.join(OUTPUT_DIR, company, `${company}_제안서.pptx`), buf);
  } catch {
    /* 파일 저장 실패는 다운로드에 영향 없음(메모리 보관) */
  }
  job.emit({ kind: "stage_done", stage: 4, title: "제안서 초안 조립", artifact: `${company}_제안서.html`, pptx: true });
}

// 한 스테이지의 토큰 델타를 SSE 이벤트로 흘린다.
function hooks(job: Job, stage: number) {
  return { onDelta: (text: string) => job.emit({ kind: "delta", stage, text }) };
}

async function runLive(job: Job, company: string, url: string, notes: string): Promise<void> {
  const ctx: LlmCtx = { client: makeClient(job.apiKey), model: job.model, effort: job.effort };

  // STAGE 1 — 공개정보 리서치: 자체 검색봇이 수집(검색) → Claude가 수집 자료로 문서 작성
  job.emit({ kind: "stage_start", stage: 1, title: "공개정보 리서치" });
  job.emit({ kind: "substatus", stage: 1, text: "자체 검색봇이 사이트를 수집 중…" });
  const pages = await crawlSite(url, (p) =>
    job.emit({ kind: "search", stage: 1, type: "page", url: p.url, title: p.title, chars: p.chars, ok: p.ok }),
  );
  const corpus = pages.length
    ? pages.map((p, i) => `## [페이지 ${i + 1}] ${p.title}\nURL: ${p.url}\n${p.text}`).join("\n\n")
    : "(검색봇이 사이트에 접근하지 못했습니다.)";
  job.emit({ kind: "substatus", stage: 1, text: `수집 ${pages.length}개 페이지 → 분석/작성 중…` });

  const research = await streamText(
    ctx,
    loadStagePrompt("stage1_research.md"),
    `회사명: ${company}\n홈페이지 URL: ${url}\n\n` +
      "아래는 **자체 검색봇이 수집한 공개 페이지 본문**이다(웹 검색 도구 미사용). 이 수집 자료에만 근거해 STAGE 1 산출 문서를 마크다운으로 작성하라. " +
      "자료로 확인되지 않는 항목은 '이번 조사 범위에서 확인하지 못함'으로 명시하라.\n\n# 수집 자료\n" +
      corpus,
    hooks(job, 1),
  );
  job.artifacts["01_공개자료_리서치.md"] = research;
  job.emit({ kind: "stage_done", stage: 1, title: "공개정보 리서치", artifact: "01_공개자료_리서치.md" });

  // STAGE 2 — 페인포인트 추론 (회의록/메모가 있을 때만, 스트리밍)
  let painpoints = "";
  if (notes.trim()) {
    job.emit({ kind: "stage_start", stage: 2, title: "페인포인트 추론" });
    painpoints = await streamText(
      ctx,
      loadStagePrompt("stage2_painpoints.md"),
      `# STAGE 1 리서치\n${research}\n\n# 회의록/메모 원본\n${notes}\n\n` +
        "위 자료로 STAGE 2 회의록 분석 문서를 마크다운으로 작성하라.",
      hooks(job, 2),
    );
    job.artifacts["02_회의록_분석.md"] = painpoints;
    job.emit({ kind: "stage_done", stage: 2, title: "페인포인트 추론", artifact: "02_회의록_분석.md" });
  } else {
    job.emit({ kind: "stage_skip", stage: 2, title: "페인포인트 추론", reason: "회의록 미입력 — 공개정보 추론만 사용" });
  }

  // STAGE 3 — 종합 분석(스트리밍) → 스토리라인 사양 구조화
  job.emit({ kind: "stage_start", stage: 3, title: "스토리라인 설계" });
  const analysis = await streamText(
    ctx,
    loadStagePrompt("stage3_storyline.md"),
    `# STAGE 1 리서치\n${research}\n\n` +
      (painpoints ? `# STAGE 2 회의록 분석\n${painpoints}\n\n` : "") +
      "위 자료를 통합해 STAGE 3 종합 분석 문서를 마크다운으로 작성하라. " +
      "문서 끝에 반드시 '▶ STORYLINE SPEC' 블록을 포함하라.",
    hooks(job, 3),
  );
  job.artifacts["03_종합_분석.md"] = analysis;

  job.emit({ kind: "substatus", stage: 3, text: "스토리라인 사양 구조화(JSON) 추출 중…" });
  const spec = await parseStoryline(
    ctx,
    "너는 리터니즈 제안서 조립기다. 아래 종합 분석 문서에서 STORYLINE SPEC을 구조화 추출하라. " +
      "리터니즈 운영 수치(CAPA 6,000건/일 등)는 발명하지 말고, 고객사 미확보 수치는 만들지 마라. " +
      "회사명/플랫폼은 분석에서 확인된 값을 쓰라.",
    `# 종합 분석\n${analysis}\n\n회사명: ${company} / 홈페이지: ${url}`,
  );
  job.emit({ kind: "stage_done", stage: 3, title: "스토리라인 설계", artifact: "03_종합_분석.md" });
  emitKeypoints(job, spec);

  await assembleStage(job, company, spec);
}

// DEMO: 워크드 산출물을 토큰 단위로 흘려 스트리밍 UI를 동일하게 시연.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function streamChunks(job: Job, stage: number, text: string): Promise<void> {
  const size = Math.max(24, Math.ceil(text.length / 90));
  for (let i = 0; i < text.length; i += size) {
    job.emit({ kind: "delta", stage, text: text.slice(i, i + size) });
    await sleep(12);
  }
}

async function runDemo(job: Job, company: string): Promise<void> {
  job.emit({
    kind: "info",
    message: "ANTHROPIC_API_KEY 미설정 → DEMO 모드(워크드 안다르 산출물 재생). 스트리밍/조립 경로는 실제 동작합니다.",
  });
  const demoSrc = path.join(RAWDATA_DIR, "안다르");
  const files: Array<[number, string, string, string]> = [
    [1, "공개정보 리서치", "01 안다르_고객사 공개자료 리서치.md", "01_공개자료_리서치.md"],
    [2, "페인포인트 추론", "02 안다르_회의록 분석.md", "02_회의록_분석.md"],
    [3, "스토리라인 설계", "03 안다르_고객사 종합 분석.md", "03_종합_분석.md"],
  ];
  for (const [stage, title, src, dst] of files) {
    job.emit({ kind: "stage_start", stage, title });
    const p = path.join(demoSrc, src);
    const body = fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : `(데모 자료 없음: ${src})`;
    await streamChunks(job, stage, body);
    job.artifacts[dst] = body;
    job.emit({ kind: "stage_done", stage, title, artifact: dst });
  }

  const spec = demoSpec(company);
  emitKeypoints(job, spec);
  await assembleStage(job, company, spec);
}

export async function runPipeline(job: Job, notes = ""): Promise<void> {
  sessions.upsert(toRecord(job)); // 시작 즉시 'running'으로 목록에 노출
  const unsub = trackPersist(job);
  try {
    // 설정 UI로 받은 키(job.apiKey) 또는 환경변수 키가 있으면 라이브, 없으면 DEMO.
    if (job.apiKey || HAS_API_KEY) await runLive(job, job.company, job.url, notes);
    else await runDemo(job, job.company);
    job.status = "done";
    job.emit({ kind: "done", proposal: `${job.company}_제안서.html` });
  } catch (err) {
    job.status = "error";
    job.error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    job.emit({ kind: "error", message: job.error });
  } finally {
    unsub();
    sessions.patch(job.id, {
      status: job.status,
      finishedAt: Date.now(),
      error: job.error,
      stage: job.stage,
      artifacts: job.artifacts,
      pages: job.pages,
      keypoints: job.keypoints,
      proposalName: job.proposalKey,
    });
  }
}
