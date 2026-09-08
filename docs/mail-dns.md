# Mail & DNS — `info@mjfird.com`

Runbook for the domain mailbox. The website (Vercel) and the mailbox (DomaiNesia
cPanel) are two different servers that share one domain, and that overlap is what
breaks mail clients. DNS for `mjfird.com` is hosted at **Vercel**
(`ns1/ns2.vercel-dns.com`), so every record below is edited in the Vercel
dashboard → Domains → `mjfird.com` → DNS Records, not in this repo.

## The problem

A mail client configured against `smtp.mjfird.com` / `imap.mjfird.com` cannot
connect. Those hostnames **have no DNS records of their own**. The zone contains a
wildcard:

```
*.mjfird.com.        1800  IN  A  216.198.79.1
*.mjfird.com.        1800  IN  A  216.198.79.65   ← Vercel's web servers
```

so any undefined subdomain silently resolves to Vercel. The mail client therefore
opens an IMAP/SMTP connection against a web CDN that speaks only HTTP, and hangs
until it times out. Because the name *does* resolve, the client reports "cannot
connect to server" rather than "server not found" — which hides the real cause.

Verified authoritative answers (`@ns1.vercel-dns.com`):

| Hostname | Resolves to | Record? |
|---|---|---|
| `mail.mjfird.com` | `36.50.77.62` | **explicit A** — the real mail server |
| `webmail.mjfird.com` | `36.50.77.62` | **explicit A** — correct |
| `smtp.mjfird.com` | Vercel IPs | ✗ wildcard — **broken for mail** |
| `imap.mjfird.com` | Vercel IPs | ✗ wildcard — **broken for mail** |
| `autodiscover.mjfird.com` | Vercel IPs | ✗ wildcard — breaks auto-setup |
| `autoconfig.mjfird.com` | Vercel IPs | ✗ wildcard — breaks auto-setup |

`36.50.77.62` reverse-resolves to `ankama.id.domainesia.com` — the cPanel host.
`MX` is correct: `10 mail.mjfird.com`.

## Fix 1 — mail client (immediate, no DNS change needed)

`mail.mjfird.com` is the one hostname that already points at the mail server. Use
it for both incoming and outgoing:

| Setting | Value |
|---|---|
| Incoming (IMAP) | `mail.mjfird.com`, port **993**, SSL/TLS |
| Outgoing (SMTP) | `mail.mjfird.com`, port **465** (SSL/TLS) or **587** (STARTTLS) |
| Username | `info@mjfird.com` — the **full address**, not `info` |
| Password | the mailbox password (cPanel → Email Accounts) |
| Authentication | required, and "use same credentials as incoming" for SMTP |

If the client shows a **certificate name mismatch**, the cPanel host's certificate
does not cover `mail.mjfird.com`. Do not click "trust" blindly — switch the server
hostname to `ankama.id.domainesia.com` (same IP, `36.50.77.62`, and the name the
certificate is issued for), or have DomaiNesia run AutoSSL for `mail.mjfird.com`.

## Fix 2 — DNS (stops it recurring, restores auto-setup)

Add explicit records so these names stop falling through to the wildcard. An
explicit record always beats a wildcard match.

```
smtp           A   36.50.77.62
imap           A   36.50.77.62
autodiscover   A   36.50.77.62
autoconfig     A   36.50.77.62
```

Keep the wildcard — it is presumably there for Vercel preview deployments. It only
causes harm for names that ought to be mail.

## Fix 3 — SPF, DKIM, DMARC

Current SPF is stale and too broad:

```
v=spf1 +mx +a +ip4:202.155.132.23 ~all
```

- `ip4:202.155.132.23` is the **old** server (`ankama.id.rapidplex.com`). The
  mailbox has since moved to `36.50.77.62`.
- `+a` authorizes the apex `A` records — which are **Vercel's web servers**. Those
  never send mail, so this grants sending rights to unrelated infrastructure.

Replace with:

```
v=spf1 +mx +ip4:36.50.77.62 ~all
```

`+mx` already covers `mail.mjfird.com`; the explicit `ip4` is belt-and-braces.

**DKIM** exists at `default._domainkey` (cPanel's selector) — leave it alone.

**DMARC is missing.** Add a monitoring-only policy first, and only tighten to
`p=quarantine` once the reports come back clean:

```
_dmarc   TXT   "v=DMARC1; p=none; rua=mailto:info@mjfird.com"
```

### If the site sends mail as `@mjfird.com`

`RESEND_API_KEY` powers inquiry notifications. If Resend is ever configured to send
*from* an `@mjfird.com` address, that domain needs Resend's own SPF include and DKIM
records added alongside the cPanel ones — otherwise those notifications fail
authentication. Resend's recommended setup uses a dedicated subdomain
(e.g. `send.mjfird.com`) so its records cannot collide with the cPanel mail records
above.

## Verifying a change

DNS edits at Vercel propagate within the record TTL (mail records are at TTL 60,
the wildcard at 1800). To confirm from a terminal:

```bash
dig +short smtp.mjfird.com          # must return 36.50.77.62, NOT a 216.x/64.x Vercel IP
dig +short imap.mjfird.com          # same
dig +short mjfird.com TXT           # check the SPF string
dig +short _dmarc.mjfird.com TXT    # check DMARC exists

# prove the mail ports actually answer
openssl s_client -connect mail.mjfird.com:993 -crlf   # IMAP over SSL
openssl s_client -connect mail.mjfird.com:465 -crlf   # SMTP over SSL
```

A healthy IMAP handshake greets with `* OK ... IMAP4rev1`. If it hangs instead, the
name is still resolving to the wildcard — or your ISP is blocking the port, worth
ruling out by testing on mobile data.

## Troubleshooting: records are correct but mail still will not connect

Run [`scripts/mail-doctor.sh`](../scripts/mail-doctor.sh) **on the machine running the
mail client**, on the normal network and then again on a phone hotspot. It checks DNS,
port reachability, the TLS certificate, and the IMAP greeting, and prints a verdict.

Key point when reasoning about this: **`mail.mjfird.com` has always pointed at
`36.50.77.62`**, before any of the DNS fixes above. So if a client configured against
`mail.mjfird.com` still cannot connect, DNS is not the cause and no DNS edit will fix
it. Work down this list instead.

### The mail ports do not answer at all

1. **Host firewall has blocked your IP.** cPanel runs cPHulk and usually CSF. Repeated
   failed logins — including the failed attempts made while the client was pointed at
   the wrong server — get the source IP blocked automatically. The block is silent:
   every port stops answering, so it looks identical to an outage. This is the most
   common cause of "it broke and now nothing I try works". Fix: ask DomaiNesia support
   to clear the block and whitelist your IP, or check
   cPanel → Security → *IP Blocker* / cPHulk if the panel is reachable.
2. **ISP blocks the ports.** Some Indonesian consumer ISPs block 25 and occasionally
   465/587/993. Re-run the script on a phone hotspot: passing there and failing at home
   confirms it.
3. **Account suspended or expired.** DNS lives at Vercel and keeps resolving perfectly
   even when the hosting account is dead, so the domain looks healthy while mail is
   entirely gone. Check the DomaiNesia billing panel, and whether webmail loads.

### Did the mailbox actually move servers?

The original SPF authorized `202.155.132.23` (`ankama.id.rapidplex.com`), while
`mail.mjfird.com` points at `36.50.77.62` (`ankama.id.domainesia.com`). That gap is
consistent with a completed server migration — but if step 4 of the script finds the
**old** server still answering on 993/465 while the new one does not, the mailbox may
never have been migrated, and `mail.mjfird.com` is simply aimed at the wrong host.

### Propagation

Vercel serves DNS from an anycast fleet, and immediately after an edit different nodes
return different answers. Right after the `smtp`/`imap` records were added, roughly one
query in five still returned the old wildcard answer. Allow ~30 minutes (the wildcard's
TTL is 1800s) before treating a stale answer as a real failure, and flush the local
resolver cache:

```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder   # macOS
resolvectl flush-caches                                          # Linux
ipconfig /flushdns                                               # Windows
```
