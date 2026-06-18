import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; name: string }> }) {
  const { id, name } = await ctx.params;
  const job = getJob(id);
  const decoded = decodeURIComponent(name);
  if (!job || !(decoded in job.artifacts)) {
    return new Response("산출물을 찾을 수 없습니다.", { status: 404 });
  }
  return new Response(job.artifacts[decoded], {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
