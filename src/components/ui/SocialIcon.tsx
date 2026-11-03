/**
 * Line icons for the social profiles, matched on the URL's host (falling back
 * to the label) so the admin never has to pick one. Drawn as simple 1.5px
 * strokes on a 24 grid rather than as brand marks, so a row of them reads as
 * one set and recolours with `currentColor`.
 */

type IconKey =
  | "instagram"
  | "youtube"
  | "x"
  | "tiktok"
  | "linkedin"
  | "github"
  | "behance"
  | "dribbble"
  | "whatsapp"
  | "facebook"
  | "threads"
  | "email"
  | "web";

const MATCHERS: [IconKey, RegExp][] = [
  ["instagram", /instagram|instagr\.am/i],
  ["youtube", /youtube|youtu\.be/i],
  ["x", /(^|\W)(x\.com|twitter)/i],
  ["tiktok", /tiktok/i],
  ["linkedin", /linkedin/i],
  ["github", /github/i],
  ["behance", /behance/i],
  ["dribbble", /dribbble/i],
  ["whatsapp", /whatsapp|wa\.me/i],
  ["facebook", /facebook|fb\.com/i],
  ["threads", /threads/i],
  ["email", /^mailto:|e-?mail/i],
];

export function socialIconKey(url: string, label = ""): IconKey {
  for (const [key, pattern] of MATCHERS) {
    if (pattern.test(url) || pattern.test(label)) return key;
  }
  return "web";
}

const PATHS: Record<IconKey, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.75" />
      <circle cx="17.1" cy="6.9" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
      <path d="M10.25 9.25v5.5l4.75-2.75z" fill="currentColor" stroke="none" />
    </>
  ),
  x: <path d="M4.5 4.5l15 15M19.5 4.5l-15 15" />,
  tiktok: (
    <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.4 2.4 2.2 4.1 4.75 4.4" />
  ),
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M8 10.5V16M8 7.75v.01M11.5 16v-5.5M11.5 13c0-1.5 1-2.5 2.25-2.5S16 11.5 16 13v3" />
    </>
  ),
  github: <path d="M9 7.5L4.5 12 9 16.5M15 7.5l4.5 4.5-4.5 4.5" />,
  behance: (
    <>
      <path d="M3.5 7h4.25a2.25 2.25 0 0 1 0 4.5H3.5zM3.5 11.5h5a2.5 2.5 0 0 1 0 5h-5zM3.5 7v9.5" />
      <path d="M14.5 13.5h6a3 3 0 1 0-.9 2.2M15 7.75h4.5" />
    </>
  ),
  dribbble: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M5.5 6.75c3.5 3 9.5 4.5 14.75 3.5M8.25 19.5C10.5 14 14.75 12 20.25 13.5M9 4c3 3.5 5.25 9 5.75 16" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M4 20l1.2-3.9A8.25 8.25 0 1 1 8.4 19z" />
      <path d="M9.25 8.75c0 3 2.75 6 6 6l1-1.5-2-1-1 .75c-.9-.4-1.85-1.35-2.25-2.25l.75-1-1-2z" />
    </>
  ),
  facebook: (
    <path d="M14.5 3.5h-1.75A3.25 3.25 0 0 0 9.5 6.75V20.5M6.75 10.5h7.5" />
  ),
  threads: (
    <path d="M16.25 10.75C15.75 8 14 6.75 12 6.75c-3 0-5 2.25-5 5.25s2 5.25 5 5.25c2.5 0 4-1.5 4-3.25 0-2.25-2.5-3-4.5-2.5-1.5.4-2 1.5-1.5 2.4.75 1.35 4.25 1.35 5-1.9" />
  ),
  email: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="M4 6.5l8 6.25 8-6.25" />
    </>
  ),
  web: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z" />
    </>
  ),
};

export default function SocialIcon({
  url,
  label,
  className = "h-[18px] w-[18px]",
}: {
  url: string;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[socialIconKey(url, label)]}
    </svg>
  );
}
