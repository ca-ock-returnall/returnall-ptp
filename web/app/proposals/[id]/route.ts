import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return new Response("작업을 찾을 수 없습니다. / Job not found.", { status: 404 });
  const key = job.proposalKey ?? `${job.company}_제안서.html`;
  if (!(key in job.artifacts)) {
    const msg = job.lang === "en" ? "The proposal is not ready yet." : "제안서가 아직 준비되지 않았습니다.";
    return new Response(msg, { status: 404 });
  }
  return new Response(job.artifacts[key], {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
