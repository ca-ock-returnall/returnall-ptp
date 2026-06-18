import { NextResponse } from "next/server";
import { listMeta } from "@/lib/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sessions: listMeta() });
}
