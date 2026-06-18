// 인메모리 작업 저장소 + 진행 이벤트 pub/sub(SSE용). 단일 프로세스 데모 범위.
import { randomBytes } from "node:crypto";

export type Ev = { kind: string; [k: string]: unknown };

// 라이브 전용 이벤트(영속 로그에 저장하지 않음).
const TRANSIENT = new Set(["delta", "search", "substatus"]);

export type JobConfig = {
  apiKey?: string;
  model: string;
  effort: string;
  demo: boolean;
  hadNotes: boolean;
  attached: string[];
  skipped: string[];
};

export class Job {
  id: string;
  company: string;
  url: string;
  apiKey?: string; // 설정 UI에서 주입된 키(없으면 환경변수 폴백)
  model: string;
  effort: string;
  demo: boolean;
  hadNotes: boolean;
  attached: string[];
  skipped: string[];
  createdAt: number = Date.now();
  status: "running" | "done" | "error" = "running";
  error?: string;
  artifacts: Record<string, string> = {};
  proposalKey?: string;
  pptx?: Buffer; // 생성된 PowerPoint 바이너리
  pptxName?: string;
  // 서버 세션 영속화용 진행 상태
  stage = 0;
  pages: { url: string; title: string; chars: number; ok: boolean }[] = [];
  keypoints: { label: string; value: string }[] = [];
  log: Ev[] = [];
  private subs = new Set<(e: Ev) => void>();

  constructor(company: string, url: string, cfg: JobConfig) {
    this.id = randomBytes(6).toString("hex");
    this.company = company;
    this.url = url;
    this.apiKey = cfg.apiKey;
    this.model = cfg.model;
    this.effort = cfg.effort;
    this.demo = cfg.demo;
    this.hadNotes = cfg.hadNotes;
    this.attached = cfg.attached;
    this.skipped = cfg.skipped;
  }

  emit(ev: Ev) {
    // 토큰 델타/툴/서브상태는 라이브 전용(로그에 안 쌓음) — 메모리·재연결 중복 방지.
    if (!TRANSIENT.has(ev.kind)) this.log.push(ev);
    for (const fn of this.subs) fn(ev);
  }

  subscribe(fn: (e: Ev) => void): () => void {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }
}

// dev/HMR 에서 모듈이 재평가돼도 저장소가 날아가지 않도록 globalThis 에 보관.
const g = globalThis as unknown as { __jobs?: Map<string, Job> };
const jobs: Map<string, Job> = g.__jobs ?? (g.__jobs = new Map());

export function createJob(company: string, url: string, cfg: JobConfig): Job {
  const job = new Job(company, url, cfg);
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}
