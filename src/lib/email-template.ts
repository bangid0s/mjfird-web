/*
  Branded HTML layout for every transactional email. Pure (no I/O) so it can
  be tested and previewed without sending anything.

  Email clients are hostile to modern CSS, so this sticks to what renders in
  Gmail, Outlook, and Apple Mail alike: nested tables, inline styles, a
  "bulletproof" padded-cell button, and a hidden preheader for the inbox
  preview line. A small <style> block adds dark-mode and mobile tweaks for
  the clients that honour it; everything still looks right where it's ignored.
*/

export type EmailLayoutInput = {
  subject: string;
  lines: string[];
  cta?: { label: string; href: string };
  siteUrl: string;
  /** Hex accent; defaults to the site's orange. */
  accent?: string;
};

const INK = "#141416";
const INK_MUTED = "#46464c";
const INK_FAINT = "#65656b";
const PAGE_BG = "#ebebe9";
const CARD_BG = "#ffffff";
const LINE = "#d6d6d2";
const FONT = "'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif";

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** "Payment received — Character Illustration (#42)" → "Payment received". */
export function headlineOf(subject: string) {
  return subject.split(" — ")[0].trim() || subject;
}

/** First non-greeting line, flattened and capped, for the inbox preview text. */
export function preheaderOf(lines: string[]) {
  const first = lines.find((l) => !/^(hi|hello|dear)\b.*,$/i.test(l.trim())) ?? lines[0] ?? "";
  const flat = first.replace(/\s+/g, " ").trim();
  return flat.length > 140 ? `${flat.slice(0, 139)}…` : flat;
}

function paragraph(line: string, i: number) {
  const isGreeting = i === 0 && /^(hi|hello|dear)\b.*,$/i.test(line.trim());
  const style = isGreeting
    ? `margin:0 0 18px;font-size:16px;line-height:1.5;font-weight:600;color:${INK}`
    : `margin:0 0 16px;font-size:15px;line-height:1.65;color:${INK_MUTED}`;
  return `<p class="em-text" style="${style}">${escapeHtml(line).replace(/\n/g, "<br>")}</p>`;
}

function button(label: string, href: string, accent: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px">
  <tr>
    <td bgcolor="${accent}" style="border-radius:999px;background:${accent}">
      <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:999px">${escapeHtml(label)}&nbsp;&rarr;</a>
    </td>
  </tr>
</table>
<p class="em-faint" style="margin:14px 0 0;font-size:12px;line-height:1.5;color:${INK_FAINT}">Button not working? Open this link:<br><a href="${escapeHtml(href)}" style="color:${INK_FAINT};word-break:break-all">${escapeHtml(href)}</a></p>`;
}

export function renderEmailHtml({ subject, lines, cta, siteUrl, accent = "#f04e23" }: EmailLayoutInput) {
  const host = siteUrl.replace(/^https?:\/\//, "");
  const year = new Date().getFullYear();
  const body = lines.map(paragraph).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<style>
  @media (max-width:600px){
    .em-card{padding:28px 22px !important}
    .em-head{padding:22px 22px !important}
    .em-title{font-size:22px !important}
  }
  @media (prefers-color-scheme:dark){
    body,.em-page{background:#0e0e0f !important}
    .em-card{background:#171719 !important;border-color:#2e2e33 !important}
    .em-title,.em-text{color:#ededea !important}
    .em-faint,.em-faint a{color:#a2a2a8 !important}
    .em-rule{border-color:#2e2e33 !important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheaderOf(lines))}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" class="em-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE_BG}" style="background:${PAGE_BG}">
  <tr>
    <td align="center" style="padding:32px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;font-family:${FONT}">
        <tr>
          <td class="em-head" bgcolor="${INK}" style="background:${INK};padding:24px 36px;border-radius:16px 16px 0 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:0.14em;color:#ffffff">
                  <a href="${escapeHtml(siteUrl)}" style="color:#ffffff;text-decoration:none">MJFIRD</a><span style="color:${accent}">.</span>
                </td>
                <td align="right" style="font-family:${FONT};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a2a2a8">Illustration &amp; Design</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td height="4" bgcolor="${accent}" style="background:${accent};height:4px;line-height:4px;font-size:0">&nbsp;</td>
        </tr>
        <tr>
          <td class="em-card" bgcolor="${CARD_BG}" style="background:${CARD_BG};padding:40px 36px 36px;border:1px solid ${LINE};border-top:0;border-radius:0 0 16px 16px">
            <h1 class="em-title" style="margin:0 0 24px;font-family:${FONT};font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.01em;color:${INK}">${escapeHtml(headlineOf(subject))}</h1>
            ${body}
            ${cta ? button(cta.label, cta.href, accent) : ""}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px">
              <tr><td class="em-rule" style="border-top:1px solid ${LINE};font-size:0;line-height:0">&nbsp;</td></tr>
            </table>
            <p class="em-text" style="margin:20px 0 0;font-size:14px;line-height:1.5;color:${INK}"><strong>M.J Fird</strong><br><span class="em-faint" style="color:${INK_FAINT}">Illustrator &amp; Graphic Designer</span></p>
          </td>
        </tr>
        <tr>
          <td align="center" class="em-faint" style="padding:24px 12px 8px;font-family:${FONT};font-size:12px;line-height:1.6;color:${INK_FAINT}">
            <a href="${escapeHtml(siteUrl)}" style="color:${INK_FAINT};text-decoration:none;font-weight:600">${escapeHtml(host)}</a><br>
            You're receiving this because of your activity on ${escapeHtml(host)}. Just reply to this email if you need anything.<br>
            &copy; ${year} MJFIRD
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
