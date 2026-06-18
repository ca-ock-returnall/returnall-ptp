import { getJob, type Ev } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return new Response("작업을 찾을 수 없습니다.", { status: 404 });

  const enc = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, ev: Ev) =>
    controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));

  const stream = new ReadableStream({
    start(controller) {
      // 이미 쌓인 로그를 먼저 흘려보낸다(구독 전 이벤트 보전). 동기 구간이라 사이에 누락 없음.
      for (const ev of [...job.log]) send(controller, ev);
      if (job.status !== "running") {
        controller.close();
        return;
      }
      const unsub = job.subscribe((ev) => {
        try {
          send(controller, ev);
        } catch {
          /* 클라이언트가 이미 닫음 */
        }
        if (ev.kind === "done" || ev.kind === "error") {
          unsub();
          controller.close();
        }
      });
      req.signal.addEventListener("abort", () => {
        unsub();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
