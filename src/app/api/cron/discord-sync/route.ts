import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { readDiscordConfig } from "@/lib/discord/config";
import { readApplicationId, registerGuildCommands } from "@/lib/discord/commands";
import { serviceClient } from "@/lib/discord/sync";
import { syncAllDiscordLinks } from "@/lib/discord/sync-all";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
  Daily Discord sync (vercel.json → crons). Vercel calls it with
  "Authorization: Bearer <CRON_SECRET>". An outside scheduler (e.g. cron-job.org)
  can call it more often with the same header.

  Each run: (re)registers the /link and /status slash commands, then re-checks
  every linked client so people who joined the server later get Web Linked.
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

  const config = readDiscordConfig();
  const db = serviceClient();
  if (!config || !db) return NextResponse.json({ ok: false, reason: "not_configured" });

  let commands: "registered" | "skipped" | "failed" = "skipped";
  const applicationId = readApplicationId();
  if (applicationId) {
    try {
      await registerGuildCommands(config, applicationId);
      commands = "registered";
    } catch (err) {
      console.error("[discord] command registration failed:", err instanceof Error ? err.message : "unknown error");
      commands = "failed";
    }
  }

  const sync = await syncAllDiscordLinks({ config, db });
  return NextResponse.json({ commands, sync });
}
