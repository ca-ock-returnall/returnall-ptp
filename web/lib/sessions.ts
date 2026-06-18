// 서버측 세션 히스토리 저장소 (파일 기반 JSON). 작업 진행/결과를 영속화해
// 새로고침·다른 브라우저에서도 보이고, 진행 중 세션도 목록에 노출된다.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config";

const DIR = path.join(ROOT, ".data");
const FILE = path.join(DIR, "sessions.json");
const CAP = 30;

export type SessionPage = { url: string; title: string; chars: number; ok: boolean };
export type SessionRecord = {
  id: string;
  company: string;
  url: string;
  createdAt: number;
  finishedAt?: number;
  status: "running" | "done" | "error";
  error?: string;
  model: string;
  effort: string;
  demo: boolean;
  hadNotes: boolean;
  attached: string[];
  skipped: string[];
  stage: number; // 현재/마지막 진행 단계(1~4) — 진행률 표시
  pages: SessionPage[];
  keypoints: { label: string; value: string }[];
  artifacts: Record<string, string>; // 단계 md + 제안서 html
  proposalName?: string;
};

function readAll(): SessionRecord[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    return [];
  }
}
function writeAll(list: SessionRecord[]) {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(list.slice(0, CAP)));
  } catch {
    /* 디스크 오류는 무시(진행 자체엔 영향 없음) */
  }
}

export function upsert(rec: SessionRecord) {
  const list = readAll().filter((r) => r.id !== rec.id);
  list.unshift(rec);
  writeAll(list);
}

export function patch(id: string, p: Partial<SessionRecord>) {
  const list = readAll();
  const i = list.findIndex((r) => r.id === id);
  if (i === -1) return;
  list[i] = { ...list[i], ...p };
  writeAll(list);
}

// 목록용 메타(무거운 artifacts 제외).
export function listMeta() {
  return readAll().map((r) => {
    const { artifacts, pages, keypoints, ...meta } = r;
    void artifacts;
    void pages;
    void keypoints;
    return meta;
  });
}

export function getFull(id: string): SessionRecord | null {
  return readAll().find((r) => r.id === id) ?? null;
}

export function remove(id: string) {
  writeAll(readAll().filter((r) => r.id !== id));
}
