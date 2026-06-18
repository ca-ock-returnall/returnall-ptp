// 4단계 오케스트레이터: 회사명+URL → 리서치 → 페인포인트 → 스토리라인 → 제안서 조립.
// pipeline/stage1~4 지침을 시스템 프롬프트로 사용한다. Claude 응답은 토큰 단위로 스트리밍한다.
// API 키가 없으면 rawdata/안다르 워크드 산출물로 DEMO 진행(조립 경로까지 실제 동작 + 스트리밍 시연).
import fs from "node:fs";
import path from "node:path";
import { assemble } from "./assemble";
import { HAS_API_KEY, OUTPUT_DIR, RAWDATA_DIR, loadStagePrompt } from "./config";
import { demoSpec } from "./demoSpec";
import { type Lang, PIPELINE, artifactNames, proposalFileName, pptxFileName } from "./i18n";
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
  const kp = PIPELINE[job.lang].kp;
  const items = [
    { label: kp.title, value: spec.proposal_title },
    { label: kp.platform, value: spec.platform },
    { label: kp.message, value: spec.hero_headline.replace(/<br\s*\/?>/gi, " ") },
    { label: kp.structure, value: spec.cards[0]?.title ?? "" },
    { label: kp.challenge, value: spec.cards[1]?.title ?? "" },
    { label: kp.direction, value: spec.cards[2]?.title ?? "" },
    { label: kp.pilot, value: spec.pilot_phases[0]?.title ?? "" },
    { label: kp.kpi, value: spec.kpi_rows.map((r) => r.dept).join(", ") },
  ].filter((x) => x.value);
  job.emit({ kind: "keypoints", items });
}

function writeProposal(company: string, html: string, lang: Lang): string {
  const outDir = path.join(OUTPUT_DIR, company);
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, proposalFileName(company, lang));
  fs.writeFileSync(filePath, html, "utf-8");
  return filePath;
}

// STAGE 4 — HTML 조립 + PowerPoint 생성 + 파일 저장 (live·demo 공용).
async function assembleStage(job: Job, company: string, spec: StorylineSpec): Promise<void> {
  const lang = job.lang;
  job.emit({ kind: "stage_start", stage: 4, title: "제안서 초안 조립" });
  const html = assemble(spec, lang);
  writeProposal(company, html, lang);
  const htmlName = proposalFileName(company, lang);
  job.artifacts[htmlName] = html;
  job.proposalKey = htmlName;

  job.emit({ kind: "substatus", stage: 4, text: PIPELINE[lang].buildingPptx });
  const buf = await buildPptx(spec, lang);
  job.pptx = buf;
  job.pptxName = pptxFileName(company, lang);
  try {
    fs.writeFileSync(path.join(OUTPUT_DIR, company, pptxFileName(company, lang)), buf);
  } catch {
    /* 파일 저장 실패는 다운로드에 영향 없음(메모리 보관) */
  }
  job.emit({ kind: "stage_done", stage: 4, title: "제안서 초안 조립", artifact: htmlName, pptx: true });
}

// 한 스테이지의 토큰 델타를 SSE 이벤트로 흘린다.
function hooks(job: Job, stage: number) {
  return { onDelta: (text: string) => job.emit({ kind: "delta", stage, text }) };
}

async function runLive(job: Job, company: string, url: string, notes: string): Promise<void> {
  const ctx: LlmCtx = { client: makeClient(job.apiKey), model: job.model, effort: job.effort };
  const lang = job.lang;
  const L = PIPELINE[lang];
  const names = artifactNames(lang);
  // 영어 산출물은 한국어 단계 지침(system)에 강한 영어 출력 지시를 덧붙여 강제한다.
  const sys = (name: string) => loadStagePrompt(name) + L.langDirective;

  // STAGE 1 — 공개정보 리서치: 자체 검색봇이 수집(검색) → Claude가 수집 자료로 문서 작성
  job.emit({ kind: "stage_start", stage: 1, title: "공개정보 리서치" });
  job.emit({ kind: "substatus", stage: 1, text: L.crawling });
  const pages = await crawlSite(url, (p) =>
    job.emit({ kind: "search", stage: 1, type: "page", url: p.url, title: p.title, chars: p.chars, ok: p.ok }),
  );
  const corpus = pages.length
    ? pages.map((p, i) => `${L.pageLabel(i + 1, p.title)}\nURL: ${p.url}\n${p.text}`).join("\n\n")
    : L.noCrawl;
  job.emit({ kind: "substatus", stage: 1, text: L.collected(pages.length) });

  const research = await streamText(ctx, sys("stage1_research.md"), L.userStage1(company, url, corpus), hooks(job, 1));
  job.artifacts[names.research] = research;
  job.emit({ kind: "stage_done", stage: 1, title: "공개정보 리서치", artifact: names.research });

  // STAGE 2 — 페인포인트 추론 (회의록/메모가 있을 때만, 스트리밍)
  let painpoints = "";
  if (notes.trim()) {
    job.emit({ kind: "stage_start", stage: 2, title: "페인포인트 추론" });
    painpoints = await streamText(ctx, sys("stage2_painpoints.md"), L.userStage2(research, notes), hooks(job, 2));
    job.artifacts[names.notes] = painpoints;
    job.emit({ kind: "stage_done", stage: 2, title: "페인포인트 추론", artifact: names.notes });
  } else {
    job.emit({ kind: "stage_skip", stage: 2, title: "페인포인트 추론", reason: L.notesSkip });
  }

  // STAGE 3 — 종합 분석(스트리밍) → 스토리라인 사양 구조화
  job.emit({ kind: "stage_start", stage: 3, title: "스토리라인 설계" });
  const analysis = await streamText(ctx, sys("stage3_storyline.md"), L.userStage3(research, painpoints), hooks(job, 3));
  job.artifacts[names.synthesis] = analysis;

  job.emit({ kind: "substatus", stage: 3, text: L.structuring });
  const spec = await parseStoryline(ctx, L.specSystem, L.userSpec(analysis, company, url), 16000, lang);
  job.emit({ kind: "stage_done", stage: 3, title: "스토리라인 설계", artifact: names.synthesis });
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
  const lang = job.lang;
  const names = artifactNames(lang);
  job.emit({ kind: "info", message: PIPELINE[lang].demoInfo });
  const demoSrc = path.join(RAWDATA_DIR, "안다르");
  // 데모 단계 본문은 안다르(한국어) 워크드 자료 고정. 최종 제안서는 demoSpec(lang)+언어별 템플릿으로 조립된다.
  const files: Array<[number, string, string, string]> = [
    [1, "공개정보 리서치", "01 안다르_고객사 공개자료 리서치.md", names.research],
    [2, "페인포인트 추론", "02 안다르_회의록 분석.md", names.notes],
    [3, "스토리라인 설계", "03 안다르_고객사 종합 분석.md", names.synthesis],
  ];
  for (const [stage, title, src, dst] of files) {
    job.emit({ kind: "stage_start", stage, title });
    const p = path.join(demoSrc, src);
    const body = fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : `(데모 자료 없음: ${src})`;
    await streamChunks(job, stage, body);
    job.artifacts[dst] = body;
    job.emit({ kind: "stage_done", stage, title, artifact: dst });
  }

  const spec = demoSpec(company, lang);
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
    job.emit({ kind: "done", proposal: proposalFileName(job.company, job.lang) });
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
