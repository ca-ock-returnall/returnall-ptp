import { NextResponse } from "next/server";
import { getFull, remove } from "@/lib/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rec = getFull(id);
  if (!rec) return new NextResponse("세션을 찾을 수 없습니다.", { status: 404 });
  return NextResponse.json(rec);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  remove(id);
  return NextResponse.json({ ok: true });
}
