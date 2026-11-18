# Discord linking and the past-client discount

Clients connect their Discord account on **/account/profile**. The site then:

- gives them the **Web Linked** role in the Fird Studio server (if they're a member)
- checks which of your **discount roles** they hold (e.g. Client 5%, VIP Client 10%; roles you give by hand). The highest one is taken off the estimate of every request they send through the website. Discounts never stack.
- shows all of their server roles on the profile page (refreshed by **Refresh roles**, `/status` and the daily sync).

The discount is applied by the database when the request is created (migration `0043_discord_link_discounts.sql`), using a role check the server made in the last hour. The browser can't set it. Your accept form opens with the discounted price and says so; PayPal checkout charges whatever final price you accept.

## 1. Create the Discord application and bot

1. Go to <https://discord.com/developers/applications> and choose **New Application** (e.g. "Fird Studio Web").
2. **OAuth2** page: copy the **Client ID** and **Client Secret** (Reset Secret if needed). Under **Redirects** add
   `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
   This is Supabase's callback, not a mjfird.com URL.
3. **Bot** page: **Reset Token** and copy it. This is `DISCORD_BOT_TOKEN`. Keep it secret.
   Leave every *Privileged Gateway Intent* off; the site only uses REST calls.
4. **Invite the bot** to your server: OAuth2 → URL Generator → scopes `bot`, permission **Manage Roles** → open the URL and pick the Fird Studio server.

## 2. Roles in your server

1. Create a role called **Web Linked** (anything you like; the site uses the id).
2. Your existing **Past Client** role stays as it is. You keep giving it by hand.
3. Server Settings → Roles: drag the **bot's role above Web Linked**. Discord only lets a bot give roles that sit below its own.
4. Turn on Developer Mode (User Settings → Advanced), then right-click to **Copy ID** for:
   - the server → `DISCORD_GUILD_ID`
   - Web Linked → `DISCORD_LINKED_ROLE_ID`
   - Past Client → `DISCORD_CLIENT_ROLE_ID`
5. Make a non-expiring invite link → `DISCORD_INVITE_URL`.

## 3. Supabase (dashboard → Authentication)

1. **Sign In / Providers → Discord**: enable it and paste the Client ID and Client Secret from step 1.2.
2. **Sign In / Providers**, at the top: turn on **Allow manual linking**. Without it, "Connect Discord" returns an error.
3. **URL Configuration → Redirect URLs** must already include `https://mjfird.com/auth/callback` (it does if Google sign-in works).
4. Apply the migrations `0043_discord_link_discounts.sql` and `0044_discord_role_list_and_labels.sql` (SQL editor, or `supabase db push`).

## 4. Vercel environment variables

Add these to Production (and Preview if you test there). All are server-only:

| Name | Value |
|---|---|
| `DISCORD_BOT_TOKEN` | Bot token from step 1.3 |
| `DISCORD_GUILD_ID` | Server id |
| `DISCORD_LINKED_ROLE_ID` | Web Linked role id |
| `DISCORD_DISCOUNT_ROLES` | Discount roles as `roleId:percent` pairs, comma-separated, e.g. `111…:5,222…:10` (each 0–50) |
| `DISCORD_CLIENT_ROLE_ID` / `DISCORD_CLIENT_DISCOUNT_PERCENT` | Older single-role setting, only used when `DISCORD_DISCOUNT_ROLES` is empty |
| `DISCORD_INVITE_URL` | `https://discord.gg/…` |
| `SUPABASE_SERVICE_ROLE_KEY` | Needed to store the role check (already set if PayPal checkout works) |
| `DISCORD_APPLICATION_ID` | General Information → Application ID (for the slash commands) |
| `DISCORD_PUBLIC_KEY` | General Information → Public Key (verifies slash-command requests; not secret) |
| `CRON_SECRET` | Any long random string. Vercel sends it to the daily sync; keep it secret |

The profile panel stays hidden until the first three are set, so you can deploy the code before finishing the setup.

## 5. Daily sync and slash commands

**Daily sync** (`vercel.json` → `/api/cron/discord-sync`, 03:00 WIB). Each run:
- registers the `/link` and `/status` slash commands in your server (safe to repeat)
- re-checks every linked client, so someone who joined the server after linking gets **Web Linked** without pressing Refresh

Vercel's free (Hobby) plan allows cron jobs once a day. For hourly runs, either upgrade to Pro and change the schedule to `0 * * * *`, or point a free scheduler such as cron-job.org at `https://mjfird.com/api/cron/discord-sync` with the header `Authorization: Bearer <CRON_SECRET>`.

To run it right away (for example to register the commands the first time): Vercel → Project → Settings → Cron Jobs → **Run**.

**Slash commands** (`/api/discord/interactions`, no always-on bot needed):
1. Developer Portal → General Information → **Interactions Endpoint URL**: `https://mjfird.com/api/discord/interactions` → Save. Discord tests the URL on save, so deploy with `DISCORD_PUBLIC_KEY` set first.
2. Run the daily sync once (above) so the commands get registered.

| Command | What the member sees (only them) |
|---|---|
| `/link` | A button to connect their mjfird.com account, plus the past-client discount if the Past Client role is set |
| `/status` | Whether they're linked and their current discount. It also refreshes their stored role check and gives Web Linked if it's missing |

## How it behaves

| Situation | What happens |
|---|---|
| Client links, is in the server | Gets Web Linked right away |
| Client links, not in the server | Sees your invite link. After joining, **Refresh roles** gives them Web Linked |
| You give someone Past Client later | Picked up automatically next time they open a request form or send a request |
| You remove Past Client | Their next request has no discount. Requests already sent keep their price |
| Discord is down while they order | Uses the last check if it's under an hour old, otherwise no discount (you can still lower the price when accepting) |
| Client disconnects Discord | Web Linked is removed and the stored link is deleted |
| Same Discord account on a second website account | Refused: one Discord account per website account |

On the admin request page, the **Client** panel shows the verified Discord account and its roles, and the accept form notes when the estimate already includes the discount.
