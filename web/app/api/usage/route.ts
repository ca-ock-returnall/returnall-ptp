import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { HAS_API_KEY, MODEL } from "@/lib/config";
import { makeClient } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "anthropic-ratelimit-";

// 응답 헤더에서 anthropic-ratelimit-* 항목만 골라 prefix 를 떼고 돌려준다.
function parseLimits(headers?: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  headers.forEach((v, k) => {
    const kl = k.toLowerCase();
    if (kl.startsWith(PREFIX)) out[kl.slice(PREFIX.length)] = v;
  });
  return out;
}

// 설정 모달이 표시할 레이트리밋 잔여치.
// Anthropic은 API 키 단위의 '남은 잔액/월 한도'를 조회하는 엔드포인트를 제공하지 않는다.
// 얻을 수 있는 잔여 신호는 응답 헤더의 anthropic-ratelimit-*(분 단위 창의 남은 요청/토큰 수와
// 리셋 시각)뿐이라, max_tokens=1 의 최소 요청을 보내 그 헤더만 읽는다.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const apiKey = (typeof body?.apiKey === "string" && body.apiKey.trim()) || undefined;
  const model = (typeof body?.model === "string" && body.model.trim()) || MODEL;

  // 설정 UI 키 우선, 없으면 서버 .env 키. 둘 다 없으면 DEMO.
  if (!apiKey && !HAS_API_KEY) return NextResponse.json({ configured: false });

  const client = makeClient(apiKey);
  try {
    const { response } = await client.messages
      .create({ model, max_tokens: 1, messages: [{ role: "user", content: "." }] })
      .withResponse();
    return NextResponse.json({ configured: true, ok: true, limits: parseLimits(response.headers) });
  } catch (e: unknown) {
    const err = e as { headers?: Headers; status?: number; error?: { type?: string }; message?: string };
    const headers = err?.headers instanceof Headers ? err.headers : undefined;
    const limits = parseLimits(headers);
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({
        configured: true,
        ok: false,
        error: "rate_limit",
        retry_after: headers?.get("retry-after") ?? null,
        limits,
      });
    }
    return NextResponse.json({
      configured: true,
      ok: false,
      error: err?.error?.type || "api_error",
      message: err?.message || String(e),
      limits,
    });
  }
}
