import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/discord/sync";
import { runReferenceCleanup } from "@/lib/commissions/reference-cleanup-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
  Daily reference cleanup (vercel.json → crons). Vercel calls it with
  "Authorization: Bearer <CRON_SECRET>". Removes client references from orders
  closed 15+ days ago and uploads never attached to an order after 48 hours.
  See src/lib/commissions/reference-cleanup.ts for the rules.
*/

function authorized(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = serviceClient();
  if (!db) return NextResponse.json({ ok: false, reason: "not_configured" });

  try {
    const result = await runReferenceCleanup(db);
    if (result.errors.length) console.error("reference-cleanup", result.errors);
    return NextResponse.json({ ok: result.errors.length === 0, ...result });
  } catch (err) {
    console.error("reference-cleanup", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
