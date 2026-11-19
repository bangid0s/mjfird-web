import { cn } from "@/lib/cn";
import { initials } from "@/lib/admin/format";

export default function ClientAvatar({ name, url, size = "sm" }: { name: string; url: string | null; size?: "sm" | "lg" }) {
  const box = size === "lg" ? "h-16 w-16 text-[20px]" : "h-10 w-10 text-[13px]";
  // Google avatars are on googleusercontent.com, which next/image isn't set up
  // for; a plain <img> keeps this page free of extra config.
  return url && /^https:\/\//.test(url) ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" referrerPolicy="no-referrer" className={cn(box, "shrink-0 rounded-full border border-line object-cover")} />
  ) : (
    <span className={cn(box, "grid shrink-0 place-items-center rounded-full border border-line bg-bg font-medium text-ink-muted")}>
      {initials(name)}
    </span>
  );
}
