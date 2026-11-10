import type { Metadata } from "next";
import LegalDocument, { FillIn, LegalSection } from "@/components/legal/LegalDocument";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms for commissioning art from M J Fird on mjfird.com, including quotes, delivery, accounts, and cancellation.",
};

export default async function TermsPage() {
  const settings = await getSiteSettings();

  return (
    <LegalDocument
      eyebrow="Terms"
      title="Terms of service"
      contactEmail={settings.contactEmail}
      related={{ href: "/privacy", label: "Privacy policy" }}
    >
      <LegalSection title="Commissions">
        <p>
          mjfird.com is where you request art commissions from M J Fird. A request is a quote: you choose a service and
          a package, and any add-ons that service offers. The estimate comes from that stored package and those
          add-ons. No payment is taken when you send the request.
        </p>
        <p>
          M J reviews the request and may accept it, ask a question, or decline it. Accepting sets the final amount
          for that order.
        </p>
        <p>
          Payment is set per order. The usual path on this site is payment after the request is accepted and before
          the work starts. Until it is paid, the request stays awaiting payment, and the work is marked in progress
          after payment. You pay by a PayPal payment link or a PayPal invoice for that order.{" "}
          <FillIn>any order that is paid after delivery, or split into more than one payment</FillIn>
        </p>
        <p>
          Each package has its own revision count, and that count is saved on the request.{" "}
          <FillIn>what counts as one revision, and which stages are included</FillIn>
        </p>
        <p>
          Each package has a delivery window in days, saved on the request. Finished files are posted on the request
          page. <FillIn>the file types you deliver, and what happens if a delivery date slips</FillIn>
        </p>
        <p>
          Finished work is for your personal use unless that order gives you a wider right.{" "}
          <FillIn>commercial use, a credit line, and whether the finished piece may be shown in the portfolio</FillIn>
        </p>
        <p>
          If a service page shows its own terms, those terms apply to orders for that service together with this page.
        </p>
      </LegalSection>

      <LegalSection title="Refunds and cancellation">
        <p>
          You can cancel a request from your account while it is pending review or awaiting payment. After the work is
          in progress, that cancel action is no longer offered. Send a message on the request instead.
        </p>
        <p>
          <FillIn>
            the refund rules, including whether a payment is returned if you or M J cancel after it is paid, and
            whether any part of that payment is kept
          </FillIn>
        </p>
      </LegalSection>

      <LegalSection title="Accounts">
        <p>
          Give a name and an email address that are yours. One person uses one account. Do not abuse the site, or
          anyone through it, and do not try to disrupt the service. M J may suspend or close an account that is
          misused.
        </p>
        <p>
          <FillIn>how someone is told about a suspension or a closed account</FillIn>
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          M J carries out an accepted commission as described on that order. M J is not liable for indirect losses,
          such as lost income, that arise from using the site or a finished piece. Nothing here removes liability that
          the law does not allow to be limited.
        </p>
        <p>
          <FillIn>
            governing law and venue. Leave this blank until a country or court is chosen. Do not add a money limit
            until the amount is chosen
          </FillIn>
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
