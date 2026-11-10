import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument, { LegalList, LegalSection, LegalTable, Term } from "@/components/legal/LegalDocument";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How FiRD Creative Studio (M.J Fird) collects, uses and protects personal data on mjfird.com, under Indonesia's Personal Data Protection Law.",
};

const linkClass =
  "text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-accent hover:decoration-accent";

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  const email = settings.contactEmail || "info@mjfird.com";
  const emailLink = (
    <a href={`mailto:${email}`} className={linkClass}>
      {email}
    </a>
  );

  return (
    <LegalDocument
      eyebrow="Privacy"
      title="Privacy policy"
      updated="10 November 2026"
      contactEmail={settings.contactEmail}
      related={{ href: "/terms", label: "Terms of service" }}
    >
      <LegalSection id="overview" title="Overview">
        <p>
          mjfird.com is run by FiRD Creative Studio, operated by Mohammad Jamaluddin Firdaus (M.J Fird) in Semarang,
          Indonesia. I collect only what I need to take, make and deliver your order, and I never sell your data. This
          policy follows Indonesia&apos;s Personal Data Protection Law (UU No. 27 of 2022).
        </p>
      </LegalSection>

      <LegalSection id="what" title="What I collect and why">
        <LegalTable
          caption="Personal data collected, why, and who else sees it"
          head={["What I collect", "Why", "Who else sees it"]}
          rows={[
            [
              "Name, email, social handles",
              "Your account, order updates, crediting you",
              "Nobody, unless you ask to be credited publicly",
            ],
            [
              "Order details, briefs, reference images",
              "Making your artwork or design",
              "Nobody; my studio assistant may see them to help with your order",
            ],
            [
              "Payment confirmations and invoices",
              "Accounting and tax records",
              "PayPal or my bank, which process the payment",
            ],
            [
              "Messages on email or Discord",
              "Communication about your order",
              "Discord or my email provider, under their own policies",
            ],
            [
              "Contact form: name, email, project type, budget range, message",
              "Replying to your inquiry",
              "Nobody",
            ],
            [
              "Basic site data (pages visited, device type)",
              "Keeping the site working and improving it",
              "My hosting and analytics providers (see below)",
            ],
          ]}
        />
      </LegalSection>

      <LegalSection id="accounts" title="Accounts and sign-in">
        <p>
          You can create an account and sign in with an email and a password through Supabase Auth. When Google sign-in
          is switched on, you can also sign in with Google through Supabase Auth.
        </p>
        <p>
          An email account asks for your name, email, and password. Supabase Auth stores the password; the site database
          does not keep a copy of it. Your name and email are saved on a client profile. A Google sign-in stores the
          email, the name shared for that account, and the profile image address when one is provided.
        </p>
        <p>
          Commission requests keep the service, package and add-ons you chose, your brief, answers to that
          service&apos;s questions, and the reference files you upload (images or PDFs). Those files are stored in a
          private storage folder. Messages on a request and the files delivered for it are kept with the request.
        </p>
      </LegalSection>

      <LegalSection id="providers" title="Where data is stored and processed">
        <LegalList>
          <li>
            <Term>Supabase</Term>{" "}stores the database (client profiles, contact inquiries, commission requests and
            messages), sign-in, and uploaded commission files.
          </li>
          <li>
            <Term>Vercel</Term>{" "}hosts the site.
          </li>
          <li>
            <Term>Google Analytics</Term>{" "}may be loaded on public pages to measure visits. It is never loaded on admin
            pages.
          </li>
          <li>
            <Term>Resend</Term>{" "}sends email about your request when email sending is set up.
          </li>
          <li>
            <Term>PayPal</Term>{" "}processes USD payments; my bank processes IDR bank transfers.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="rights" title="Payments, retention and your rights">
        <LegalList>
          <li>
            <Term>Card details:</Term>{" "}I never see or store your card or bank account numbers. PayPal and banks handle
            them.
          </li>
          <li>
            <Term>Retention:</Term>{" "}account and order data are kept while your account is active. Invoices and payment
            records are kept as long as Indonesian tax law requires. Reference images are deleted 6 months after
            delivery.
          </li>
          <li>
            <Term>Your rights:</Term>{" "}you can ask to see, correct, or delete your data, or withdraw consent, by emailing{" "}
            {emailLink}. I reply within 14 days. Records I must keep for tax purposes cannot be deleted early.
          </li>
          <li>
            <Term>Security:</Term>{" "}data is stored with reputable providers and access is limited to me and my assistant.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies">
        <p>
          The site uses cookies needed for login and basic function: signing in sets session cookies through Supabase
          Auth so you can stay signed in.
        </p>
        <p>
          When Google Analytics is loaded, Google may set analytics cookies. When it is not loaded, the site does not set
          analytics cookies.
        </p>
        <p>
          Your light or dark theme choice and sound on or off choice are saved in your browser&apos;s local storage, not
          in cookies.
        </p>
      </LegalSection>

      <LegalSection id="other" title="Age and changes">
        <LegalList>
          <li>
            <Term>Age:</Term>{" "}the site is not meant for children under 13. Ordering requires being 18+ or having a
            guardian&apos;s consent (see the{" "}
            <Link href="/terms#section-1" className={linkClass}>
              terms of service
            </Link>
            ).
          </li>
          <li>
            <Term>Changes:</Term>{" "}updates are posted on this page with a new date.
          </li>
        </LegalList>
      </LegalSection>
    </LegalDocument>
  );
}
