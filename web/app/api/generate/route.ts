import { NextResponse } from "next/server";
import { extractFiles } from "@/lib/attachments";
import { EFFORT, HAS_API_KEY, MODEL } from "@/lib/config";
import { createJob } from "@/lib/jobs";
import { runPipeline } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NOTES_CHARS = 200000;

export async function POST(req: Request) {
  const form = await req.formData();
  const company = String(form.get("company") ?? "").trim();
  const url = String(form.get("url") ?? "").trim();
  const pasted = String(form.get("notes") ?? "").trim();
  if (!company || !url) {
    return new NextResponse("회사명과 URL은 필수입니다.", { status: 400 });
  }

  // 설정 UI 값(없으면 .env 기본값). API 키는 응답/로그에 노출하지 않는다.
  const apiKey = String(form.get("apiKey") ?? "").trim() || undefined;
  const model = String(form.get("model") ?? "").trim() || MODEL;
  const effort = String(form.get("effort") ?? "").trim() || EFFORT;
  const hasKey = !!apiKey || HAS_API_KEY;

  // 첨부된 회의록 파일에서 텍스트 추출 → 붙여넣은 메모와 합침.
  const files = form.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
  const { parts, attached, skipped } = await extractFiles(files);
  let notes = [pasted, ...parts].filter(Boolean).join("\n\n");
  if (notes.length > MAX_NOTES_CHARS) notes = notes.slice(0, MAX_NOTES_CHARS) + "\n…(이하 생략)";

  const job = createJob(company, url, {
    apiKey,
    model,
    effort,
    demo: !hasKey,
    hadNotes: notes.trim().length > 0,
    attached,
    skipped,
  });
  // 백그라운드 진행(응답을 막지 않음). 오류는 runPipeline 내부에서 잡아 이벤트로 보고.
  void runPipeline(job, notes);
  return NextResponse.json({
    job_id: job.id,
    demo_mode: !hasKey,
    model: hasKey ? model : "demo",
    effort,
    key_source: apiKey ? "설정" : HAS_API_KEY ? ".env" : "none",
    attached,
    skipped,
  });
}
