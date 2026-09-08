#!/usr/bin/env bash
# mail-doctor.sh — diagnose why a mail client cannot reach info@mjfird.com
#
# Run this ON YOUR OWN MACHINE (not on a server), from the same network the
# mail client uses:   bash scripts/mail-doctor.sh
#
# Then run it again on a phone hotspot. If it passes on the hotspot but fails
# on your normal network, your ISP or router is the problem, not the mail host.

DOMAIN="mjfird.com"
MAILHOST="mail.${DOMAIN}"
CPANEL_HOST="ankama.id.domainesia.com"   # the cPanel server's own name
OLD_SERVER="202.155.132.23"              # previous server, per the old SPF record

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; }
info() { printf '  \033[33m•\033[0m %s\n' "$1"; }
head_() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# --- portable TCP connect test -------------------------------------------
tcp() { # tcp <host> <port> -> 0 open, 1 closed/filtered
  if command -v nc >/dev/null 2>&1; then
    nc -z -w 6 "$1" "$2" >/dev/null 2>&1
  else
    (exec 3<>"/dev/tcp/$1/$2") >/dev/null 2>&1
  fi
}

head_ "1. DNS — where do the mail names point?"
if ! command -v dig >/dev/null 2>&1 && ! command -v host >/dev/null 2>&1; then
  info "neither 'dig' nor 'host' is installed — skipping DNS checks"
  info "  macOS/Linux: they ship by default; otherwise install 'bind-utils'/'dnsutils'"
fi
for h in "$MAILHOST" "smtp.$DOMAIN" "imap.$DOMAIN" "webmail.$DOMAIN"; do
  if ! command -v dig >/dev/null 2>&1 && ! command -v host >/dev/null 2>&1; then break; fi
  ips=$( { command -v dig >/dev/null 2>&1 && dig +short "$h" A; } \
         || { command -v host >/dev/null 2>&1 && host -t A "$h" | awk '/has address/{print $NF}'; } )
  ips=$(echo "$ips" | tr '\n' ' ' | sed 's/ *$//')
  case "$ips" in
    *36.50.77.62*)              pass "$h -> $ips" ;;
    *216.198.79.*|*64.29.17.*)  fail "$h -> $ips   (Vercel web server — NOT a mail server)" ;;
    "")                         fail "$h -> no answer" ;;
    *)                          info "$h -> $ips   (unexpected — verify with your host)" ;;
  esac
done

head_ "2. Mail ports on $MAILHOST — do they answer at all?"
any_open=0
for p in 993 465 587 143 110 995; do
  if tcp "$MAILHOST" "$p"; then pass "port $p open"; any_open=1
  else fail "port $p blocked or filtered"; fi
done

head_ "3. Is the server reachable on any port? (isolates port-blocking)"
for p in 443 2096 2083; do
  if tcp "$MAILHOST" "$p"; then pass "port $p open"
  else fail "port $p blocked or filtered"; fi
done

head_ "4. Is the OLD server still serving mail? (did the mailbox actually move?)"
for p in 993 465; do
  if tcp "$OLD_SERVER" "$p"; then
    info "port $p OPEN on $OLD_SERVER — the old server still answers."
    info "  If the new one does not, your mailbox may never have been migrated."
  else
    pass "port $p not answering on old server (expected after a completed migration)"
  fi
done

head_ "5. TLS certificate on port 993 — does it cover $MAILHOST?"
if command -v openssl >/dev/null 2>&1 && [ "$any_open" = 1 ]; then
  cert=$(echo | openssl s_client -connect "${MAILHOST}:993" -servername "$MAILHOST" 2>/dev/null \
          | openssl x509 -noout -subject -ext subjectAltName 2>/dev/null)
  if [ -n "$cert" ]; then
    echo "$cert" | sed 's/^/    /'
    if echo "$cert" | grep -q "$MAILHOST"; then
      pass "certificate covers $MAILHOST"
    else
      fail "certificate does NOT cover $MAILHOST"
      info "use '$CPANEL_HOST' as the server name instead, or ask DomaiNesia to run AutoSSL"
    fi
  else
    fail "no TLS handshake on 993"
  fi
else
  info "skipped (openssl missing, or no mail port reachable)"
fi

head_ "6. IMAP greeting — is a real mail server behind the port?"
if [ "$any_open" = 1 ] && command -v openssl >/dev/null 2>&1; then
  greet=$(echo "a1 LOGOUT" | openssl s_client -connect "${MAILHOST}:993" -crlf -quiet 2>/dev/null | head -2)
  if echo "$greet" | grep -qi "IMAP"; then
    pass "server greets: $(echo "$greet" | head -1)"
    info "the mail server is alive — remaining suspects are credentials or client settings"
  else
    fail "no IMAP greeting received"
  fi
else
  info "skipped (no reachable mail port)"
fi

head_ "Verdict"
if [ "$any_open" = 1 ]; then
  echo "  Mail ports answer. DNS and reachability are fine — focus on the mail"
  echo "  client: username must be the FULL address (info@mjfird.com), and check"
  echo "  the password in cPanel -> Email Accounts."
else
  echo "  No mail port answers on $MAILHOST. Most likely, in order:"
  echo "    1. Your IP is firewall-blocked by the host (cPHulk/CSF) after repeated"
  echo "       failed logins — ask DomaiNesia support to whitelist your IP."
  echo "    2. Your ISP blocks mail ports — re-run this on a phone hotspot."
  echo "    3. The hosting account is suspended or expired — check the DomaiNesia"
  echo "       billing panel, and whether webmail loads in a browser."
fi
echo
