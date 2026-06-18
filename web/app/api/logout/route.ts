import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 상대 경로 Location — 프록시 뒤 내부 호스트(localhost) 노출 방지.
function clear() {
  const res = new NextResponse(null, { status: 303, headers: { Location: "/login" } });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET() {
  return clear();
}

export async function POST() {
  return clear();
}
