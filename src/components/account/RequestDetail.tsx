import Link from "next/link";
import FileLinks from "@/components/commissions/FileLinks";
import MessageThread from "@/components/commissions/MessageThread";
import OrderSummary from "@/components/commissions/OrderSummary";
import StatusChip from "@/components/commissions/StatusChip";
import CancelRequestButton from "@/components/commissions/CancelRequestButton";
import ReviewForm from "@/components/commissions/ReviewForm";
import RequestProgress from "@/components/account/RequestProgress";
import { cn } from "@/lib/cn";
import { deliveryHost } from "@/lib/commissions/delivery-link";
import type { NextStep } from "@/lib/commissions/next-step";
import type { RequestState } from "@/lib/client/request-actions";
import type { CommissionMessageRow, CommissionRequestRow, TestimonialRow } from "@/lib/supabase/types";

type SignedFile = { url: string; name: string; path: string };
type Review = Pick<TestimonialRow, "quote" | "name" | "role" | "rating" | "public_consent" | "status"> | null;

function Section({ id, title, children, className }: { id?: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn("flex scroll-mt-28 flex-col gap-4", className)}>
      <h2 id={id ? `${id}-title` : undefined} className="text-body-lg font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * What happens next, first. When the next move is the client's, the block is
 * the accent colour and carries the action itself — including payment, which
 * used to sit at the very bottom of the page on phones.
 */
function NextStepPanel({ step, note, payment }: { step: NextStep; note: string; payment: React.ReactNode }) {
  const yours = step.owner === "yours";
  const showAction = step.action && !(payment && step.action.href === "#payment");
  return (
    <section
      aria-label="Next step"
      className={cn("flex flex-col gap-4 p-5 sm:p-6", yours ? "bg-accent text-accent-ink" : "border border-line bg-bg-raised")}
    >
      <div className="flex flex-col gap-1.5">
        <p className={cn("text-body-sm", yours ? "opacity-80" : "text-ink-muted")}>{yours ? "Your next step" : step.owner === "ours" ? "Next up" : "Status"}</p>
        <h2 className={cn("display-sm", yours && "text-accent-ink")}>{step.title}</h2>
        <p className={cn("max-w-xl text-body text-pretty", yours ? "opacity-90" : "text-ink-muted")}>{step.body}</p>
      </div>

      {note && (
        <blockquote className={cn("max-w-xl border-l-2 pl-4 text-body whitespace-pre-line", yours ? "border-current/40" : "border-accent text-ink")}>
          <span className={cn("mb-1 block text-body-sm", yours ? "opacity-80" : "text-ink-muted")}>Note from MJFIRD</span>
          {note}
        </blockquote>
      )}

      {payment && (
        <div id="payment" className="scroll-mt-28 max-w-sm bg-bg p-4 text-ink">
          {payment}
        </div>
      )}

      {showAction && step.action && (
        <a
          href={step.action.href}
          className={cn(
            "label inline-flex items-center justify-center self-start px-5 py-3 transition-[filter]",
            yours ? "bg-accent-ink text-accent hover:brightness-125" : "border border-line-strong text-ink hover:bg-bg",
          )}
        >
          {step.action.label}
        </a>
      )}
    </section>
  );
}

export default function RequestDetail({
  req,
  step,
  messages,
  refs,
  deliveries,
  deliveryUrl,
  review,
  payment,
  submitted,
  postMessage,
  submitReview,
}: {
  req: CommissionRequestRow;
  step: NextStep;
  messages: CommissionMessageRow[];
  refs: SignedFile[];
  deliveries: SignedFile[];
  deliveryUrl: string | null;
  review: Review;
  /** The pay link or PayPal checkout, when there is one to show. */
  payment: React.ReactNode;
  submitted: boolean;
  postMessage: (prev: RequestState, formData: FormData) => Promise<RequestState>;
  submitReview: (prev: RequestState, formData: FormData) => Promise<RequestState>;
}) {
  const hasFiles = deliveries.length > 0 || Boolean(deliveryUrl);
  const canCancel = req.status === "pending" || req.status === "awaiting_payment";
  const sent = new Date(req.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="container-page pb-[var(--space-section)] pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/account" className="label inline-flex items-center gap-1.5 transition-colors hover:text-ink">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M10 3 5 8l5 5" />
          </svg>
          All requests
        </Link>
      </nav>

      {submitted && (
        <p role="status" className="mb-8 border border-success/50 px-5 py-4 text-body text-ink">
          Request sent. I&apos;ll review it and reply here, and you&apos;ll get an email too.
        </p>
      )}

      <header className="mb-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={req.status} />
          {req.waitlisted && req.status === "pending" && <span className="text-body-sm text-ink-muted">On the waitlist</span>}
        </div>
        <h1 className="display-lg text-balance">{req.service_title}</h1>
        <p className="text-body text-ink-muted">
          Request #{req.ref}, {req.package_name}, sent {sent}
        </p>
      </header>

      <div className="mb-10 max-w-3xl">
        <RequestProgress req={req} />
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_21rem] lg:gap-14">
        <div className="flex min-w-0 flex-col gap-12">
          <NextStepPanel step={step} note={req.artist_note} payment={payment} />

          {hasFiles && (
            <Section id="files" title="Your files">
              {deliveryUrl && (
                <a
                  href={deliveryUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group flex items-center justify-between gap-4 border border-line-strong bg-bg-raised px-5 py-4 transition-colors hover:border-accent"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-body font-medium text-ink">Open the download folder</span>
                    <span className="truncate text-body-sm text-ink-muted">{deliveryHost(deliveryUrl) || "External link"}</span>
                  </span>
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 shrink-0 text-accent-strong" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <path d="M5 11 11 5M6 5h5v5" />
                  </svg>
                </a>
              )}
              {deliveries.length > 0 && <FileLinks files={deliveries} />}
            </Section>
          )}

          {req.status === "completed" && (
            <Section id="review" title={review ? "Your review" : "Leave a review"}>
              <ReviewForm action={submitReview} existing={review} defaultName={req.contact_name} />
            </Section>
          )}

          <Section id="messages" title="Messages">
            <MessageThread messages={messages} action={postMessage} viewer="client" clientName={req.contact_name} />
          </Section>

          <details className="group border-t border-line pt-6" open={req.status === "pending"}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <span className="text-body-lg font-semibold text-ink">
                Your brief
                <span className="ml-2 text-body-sm font-normal text-ink-faint">
                  {refs.length} reference{refs.length === 1 ? "" : "s"}
                </span>
              </span>
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 text-ink-faint transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path d="m4 6 4 4 4-4" />
              </svg>
            </summary>
            <div className="flex flex-col gap-5 pt-5">
              <p className="max-w-[68ch] whitespace-pre-line text-body text-pretty text-ink">{req.brief}</p>
              {req.answers.length > 0 && (
                <dl className="flex flex-col gap-4">
                  {req.answers.map((a) => (
                    <div key={a.id} className="flex flex-col gap-1">
                      <dt className="text-body-sm text-ink-muted">{a.label}</dt>
                      <dd className="whitespace-pre-line text-body text-ink">{Array.isArray(a.value) ? a.value.join(", ") : a.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {refs.length > 0 && <FileLinks files={refs} />}
            </div>
          </details>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:self-start">
          <div className="flex flex-col gap-5 border border-line p-5 sm:p-6">
            <h2 className="text-body font-semibold text-ink">Order</h2>
            <OrderSummary req={req} />
          </div>
          {canCancel && <CancelRequestButton requestId={req.id} />}
        </aside>
      </div>
    </div>
  );
}
