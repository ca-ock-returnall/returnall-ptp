import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job || !job.pptx) {
    const msg = job?.lang === "en" ? "The PPTX is not ready yet." : "PPTX가 아직 준비되지 않았습니다.";
    return new Response(msg, { status: 404 });
  }
  const name = job.pptxName ?? "proposal.pptx";
  // 한글 파일명: RFC 5987 인코딩 + ascii 폴백
  const disp = `attachment; filename="proposal.pptx"; filename*=UTF-8''${encodeURIComponent(name)}`;
  return new Response(new Uint8Array(job.pptx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": disp,
      "Content-Length": String(job.pptx.length),
    },
  });
}
