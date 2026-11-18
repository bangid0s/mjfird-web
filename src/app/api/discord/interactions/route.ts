import { after, NextResponse } from "next/server";
import { readDiscordConfig } from "@/lib/discord/config";
import { addMemberRole } from "@/lib/discord/api";
import { handleInteraction, readPublicKey, verifyDiscordRequest, type Interaction } from "@/lib/discord/interactions";
import { serviceClient } from "@/lib/discord/sync";
import { SITE_URL } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  Discord's Interactions Endpoint URL (Developer Portal → General Information):
  https://mjfird.com/api/discord/interactions
  Discord rejects the URL unless bad signatures get a 401, so verify first.
*/
export async function POST(request: Request) {
  const publicKey = readPublicKey();
  if (!publicKey) return NextResponse.json({ error: "Not configured." }, { status: 404 });

  const body = await request.text();
  const valid = await verifyDiscordRequest(
    publicKey,
    request.headers.get("x-signature-ed25519"),
    request.headers.get("x-signature-timestamp"),
    body,
  );
  if (!valid) return new NextResponse("invalid request signature", { status: 401 });

  let interaction: Interaction;
  try {
    interaction = JSON.parse(body) as Interaction;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const config = readDiscordConfig();
  const replyBody = await handleInteraction(interaction, {
    config,
    db: serviceClient(),
    siteUrl: SITE_URL,
    addLinkedRole: config
      ? (userId) =>
          after(async () => {
            try {
              await addMemberRole(config, userId, config.linkedRoleId);
            } catch (err) {
              console.error("[discord] role add from /status failed:", err instanceof Error ? err.message : "unknown error");
            }
          })
      : undefined,
  });
  return NextResponse.json(replyBody);
}
