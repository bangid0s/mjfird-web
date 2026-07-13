import { Fragment } from "react";
import { normalizeMediaUrl } from "@/lib/media";

// Matches http(s):// URLs, bare www. / domain.tld URLs, and email addresses.
const PATTERN =
  /((?:https?:\/\/|www\.)[^\s<]+|\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b)/gi;

const TRAILING = /[.,;:!?)\]}'"»”]+$/;

// Turns plain text into React nodes with URLs and emails as clickable links.
// Trailing sentence punctuation is kept out of the link target.
export default function Linkify({ text, className }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(PATTERN)) {
    const raw = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) parts.push(text.slice(lastIndex, start));

    const trailingMatch = raw.match(TRAILING);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const token = trailing ? raw.slice(0, raw.length - trailing.length) : raw;

    const isEmail = token.includes("@") && !token.includes("/");
    const href = isEmail ? `mailto:${token}` : normalizeMediaUrl(token);

    parts.push(
      <a
        key={key++}
        href={href}
        {...(isEmail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        className={
          className ??
          "text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
        }
      >
        {token}
      </a>,
    );

    if (trailing) parts.push(trailing);
    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  );
}
