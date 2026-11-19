import Link from "next/link";
import { cn } from "@/lib/cn";
import { STATUS_FLOW, STATUS_SHORT, priceOf } from "@/lib/commissions/status";
import { isFinished, stepIndex, type NextStep } from "@/lib/commissions/next-step";
import { formatUSD } from "@/lib/services/storefront";
import type { CommissionRequestRow } from "@/lib/supabase/types";

export type OverviewItem = {
  req: Pick<
    CommissionRequestRow,
    "id" | "ref" | "service_title" | "package_name" | "status" | "created_at" | "final_price" | "estimated_total" | "waitlisted"
  >;
  step: NextStep;
  /** Unread notifications for this request. */
  unread: number;
  /** A signed preview of the newest delivery, else the first reference. */
  thumbUrl: string | null;
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function Thumb({ url, title, className }: { url: string | null; title: string; className?: string }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden bg-bg-raised-2", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center font-display text-lg font-semibold text-ink-faint">
          {title.trim().charAt(0).toUpperCase() || "#"}
        </span>
      )}
    </span>
  );
}

/** Five segments: where this request is on the way from sent to completed. */
function MiniProgress({ status }: { status: CommissionRequestRow["status"] }) {
  const at = stepIndex(status);
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex gap-1" aria-hidden="true">
        {STATUS_FLOW.map((s, i) => (
          <span key={s} className={cn("h-1 w-5", i <= at ? "bg-accent" : "bg-line")} />
        ))}
      </span>
      <span className="text-[13px] text-ink-muted">
        {STATUS_SHORT[status]}
        <span className="sr-only">, step {at + 1} of {STATUS_FLOW.length}</span>
      </span>
    </span>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
      {count} new
    </span>
  );
}

function NeedsYou({ items }: { items: OverviewItem[] }) {
  return (
    <section aria-labelledby="needs-you" className="bg-accent text-accent-ink">
      <h2 id="needs-you" className="px-5 pt-5 text-body font-semibold sm:px-6">
        {items.length === 1 ? "One thing needs you" : `${items.length} things need you`}
      </h2>
      <ul className="mt-3 flex flex-col">
        {items.map(({ req, step }) => (
          <li key={req.id} className="border-t border-current/15">
            <Link
              href={`/account/requests/${req.id}${step.action?.href ?? ""}`}
              className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-black/5 sm:flex-row sm:items-center sm:gap-6 sm:px-6"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body font-semibold">{step.title}</span>
                <span className="truncate text-body-sm opacity-80">
                  #{req.ref} {req.service_title}
                </span>
              </span>
              {step.action && (
                <span className="inline-flex shrink-0 items-center justify-center self-start bg-accent-ink px-4 py-2.5 text-body-sm font-medium text-accent transition-transform group-hover:-translate-y-px sm:self-auto">
                  {step.action.label}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OpenRow({ item }: { item: OverviewItem }) {
  const { req, step, unread, thumbUrl } = item;
  return (
    <li className="border-b border-line">
      <Link href={`/account/requests/${req.id}`} className="group flex gap-4 py-5 sm:items-center sm:gap-6">
        <Thumb url={thumbUrl} title={req.service_title} className="h-16 w-16 sm:h-20 sm:w-20" />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-body-lg font-medium text-ink transition-colors group-hover:text-accent-strong">
              {req.service_title}
            </span>
            <UnreadBadge count={unread} />
          </span>
          <span className="text-body-sm text-ink-muted">
            #{req.ref}, {req.package_name}, sent {shortDate(req.created_at)}
            {req.waitlisted && req.status === "pending" ? ". On the waitlist" : ""}
          </span>
          <MiniProgress status={req.status} />
          <span className="text-body-sm text-ink-faint sm:hidden">{step.title}</span>
        </span>
        <span className="hidden shrink-0 flex-col items-end gap-1 text-right sm:flex">
          <span className="text-body font-medium text-ink tabular-nums">{formatUSD(priceOf(req))}</span>
          <span className="max-w-[14rem] text-[13px] text-ink-faint">{step.title}</span>
        </span>
      </Link>
    </li>
  );
}

function FinishedRow({ item }: { item: OverviewItem }) {
  const { req, thumbUrl } = item;
  return (
    <li className="border-b border-line">
      <Link href={`/account/requests/${req.id}`} className="group flex items-center gap-4 py-3.5">
        <Thumb url={thumbUrl} title={req.service_title} className="h-10 w-10" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body text-ink transition-colors group-hover:text-accent-strong">{req.service_title}</span>
          <span className="text-[13px] text-ink-faint">
            #{req.ref}, {shortDate(req.created_at)}
          </span>
        </span>
        <span className="shrink-0 text-body-sm text-ink-muted">{STATUS_SHORT[req.status]}</span>
        <span className="hidden w-20 shrink-0 text-right text-body-sm text-ink-muted tabular-nums sm:block">
          {req.status === "completed" ? formatUSD(priceOf(req)) : ""}
        </span>
      </Link>
    </li>
  );
}

function EmptyState() {
  const steps = [
    ["Send a brief", "Pick a service, choose a package and describe what you'd like. Attach references if you have them."],
    ["Get a final price", "I read every request and reply here with a price, or questions first."],
    ["Pay, then I start", "Once it's paid, updates and sketches arrive in the request's messages."],
  ];
  return (
    <div className="grid gap-10 border-t border-line pt-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
      <div className="flex flex-col items-start gap-5">
        <h2 className="display-sm">No requests yet</h2>
        <p className="max-w-md text-body text-pretty text-ink-muted">
          Everything about a commission lives here: its price, payment, messages and the finished files.
        </p>
        <Link href="/services" className="label bg-accent px-5 py-3 text-accent-ink transition-[filter] hover:brightness-110">
          Browse services
        </Link>
      </div>
      <ol className="flex flex-col">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-4 border-t border-line py-4 first:border-t-0 first:pt-0">
            <span className="w-5 shrink-0 font-display text-body font-semibold text-accent-strong tabular-nums">{i + 1}</span>
            <span className="flex flex-col gap-1">
              <span className="text-body font-medium text-ink">{title}</span>
              <span className="text-body-sm text-pretty text-ink-muted">{body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function RequestOverview({ items, discordNudge }: { items: OverviewItem[]; discordNudge?: boolean }) {
  if (items.length === 0) return <EmptyState />;

  const yours = items.filter((i) => i.step.owner === "yours");
  const open = items.filter((i) => !isFinished(i.req.status));
  const finished = items.filter((i) => isFinished(i.req.status));

  return (
    <div className="flex flex-col gap-12">
      {yours.length > 0 && <NeedsYou items={yours} />}

      {open.length > 0 && (
        <section aria-labelledby="open-requests">
          <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
            <h2 id="open-requests" className="text-body font-semibold text-ink">
              In progress
            </h2>
            <Link href="/services" className="label transition-colors hover:text-ink">
              New request
            </Link>
          </div>
          <ul>
            {open.map((item) => (
              <OpenRow key={item.req.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      {discordNudge && (
        <Link
          href="/account/profile#discord-heading"
          className="flex flex-col gap-1 border border-line px-5 py-4 transition-colors hover:border-line-strong hover:bg-bg-raised sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <span className="text-body-sm text-ink">
            <span className="font-medium">In the Fird Studio Discord?</span> Link your account and client roles get a discount on every new order.
          </span>
          <span className="label shrink-0 text-ink">Link Discord</span>
        </Link>
      )}

      {finished.length > 0 && (
        <section aria-labelledby="finished-requests">
          <h2 id="finished-requests" className="border-b border-line pb-3 text-body font-semibold text-ink">
            Finished
          </h2>
          <ul>
            {finished.map((item) => (
              <FinishedRow key={item.req.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      {open.length === 0 && (
        <Link href="/services" className="label self-start bg-accent px-5 py-3 text-accent-ink transition-[filter] hover:brightness-110">
          Start a new request
        </Link>
      )}
    </div>
  );
}
