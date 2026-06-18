// Anthropic 호출 래퍼 (스트리밍, 텍스트 전용).
// 작업별 컨텍스트(client/model/effort)를 받는다 — API 키·모델·effort를 설정 UI에서 주입 가능.
// 공개자료 '검색'은 자체 검색봇(searchbot.ts)이 수행하고, Claude는 수집 자료로 문서를 '작성'만 한다.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { StorylineSpecSchema, type StorylineSpec } from "./schema";

export type LlmCtx = { client: Anthropic; model: string; effort: string };

// apiKey 가 있으면 그 키로, 없으면 환경변수(ANTHROPIC_API_KEY)로 클라이언트 생성.
export function makeClient(apiKey?: string): Anthropic {
  return apiKey ? new Anthropic({ apiKey }) : new Anthropic();
}

function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export async function streamText(
  ctx: LlmCtx,
  system: string,
  user: string,
  opts: { maxTokens?: number; onDelta?: (text: string) => void } = {},
): Promise<string> {
  const { maxTokens = 16000, onDelta } = opts;
  let full = "";
  const stream = ctx.client.messages.stream({
    model: ctx.model,
    max_tokens: maxTokens,
    system,
    output_config: { effort: ctx.effort }, // 속도/품질 레버 (low=빠름)
    messages: [{ role: "user", content: user }],
  } as any);

  for await (const event of stream as any) {
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      full += event.delta.text;
      onDelta?.(event.delta.text);
    }
  }
  await stream.finalMessage();
  return full.trim();
}

export async function parseStoryline(ctx: LlmCtx, system: string, user: string, maxTokens = 16000): Promise<StorylineSpec> {
  const resp = await ctx.client.messages.parse({
    model: ctx.model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(StorylineSpecSchema), effort: ctx.effort },
  } as any);
  const parsed = (resp as any).parsed_output as StorylineSpec | null;
  if (!parsed) throw new Error(`스토리라인 사양 구조화 실패 (stop_reason=${(resp as any).stop_reason})`);
  return parsed;
}

void textOf; // (재사용 대비 — 현재 경로는 스트림 델타로 텍스트를 수집)
