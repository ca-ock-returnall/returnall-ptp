// 경로·환경설정. 저장소 루트의 기존 자산(pipeline/, content-library/, rawdata/)을 그대로 읽는다.
import fs from "node:fs";
import path from "node:path";

function findRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 7; i++) {
    if (fs.existsSync(path.join(dir, "pipeline", "stage1_research.md"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export const ROOT = findRoot();
export const PIPELINE_DIR = path.join(ROOT, "pipeline");
export const CONTENT_DIR = path.join(ROOT, "content-library");
export const TEMPLATE_PATH = path.join(CONTENT_DIR, "proposal-template.html");
export const RAWDATA_DIR = path.join(ROOT, "rawdata");
export const OUTPUT_DIR = path.join(ROOT, "output");

export const MODEL = process.env.PROPOSAL_MODEL || "claude-opus-4-8";
// 속도 레버: Opus 4.8에서 effort 가 지연/토큰을 좌우한다. 기본 low(빠름), 품질 우선 시 medium/high.
export const EFFORT = process.env.PROPOSAL_EFFORT || "low";
export const HAS_API_KEY = !!process.env.ANTHROPIC_API_KEY;

export function loadStagePrompt(name: string): string {
  return fs.readFileSync(path.join(PIPELINE_DIR, name), "utf-8");
}

export function loadTemplate(): string {
  return fs.readFileSync(TEMPLATE_PATH, "utf-8");
}
