import type { Metadata } from "next";
import LegalDocument, { FillIn, LegalSection } from "@/components/legal/LegalDocument";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How mjfird.com handles account details, commission requests, contact messages, payments, and cookies.",
};

export default async function PrivacyPage() {
  const settings = await getSiteSettings();

  return (
    <LegalDocument
      eyebrow="Privacy"
      title="Privacy policy"
      contactEmail={settings.contactEmail}
      related={{ href: "/terms", label: "Terms of service" }}
    >
      <LegalSection title="Who runs this site">
        <p>mjfird.com is an art commission site run by M J Fird.</p>
      </LegalSection>

      <LegalSection title="Accounts and sign-in">
        <p>
          You can create an account and sign in with an email and a password through Supabase Auth. When Google
          sign-in is switched on, you can also sign in with Google through Supabase Auth. The Google button is shown
          only when that provider is enabled.
        </p>
        <p>
          An email account asks for your name, email, and password. Supabase Auth stores the password. The site
          database does not keep a copy of it. Your name and email are saved on a client profile.
        </p>
        <p>
          A Google sign-in uses the same Supabase Auth account. The client profile stores the email, the name shared
          for that account, and the profile image address when one is provided.
        </p>
      </LegalSection>

      <LegalSection title="What is collected">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>Account details described above: name, email, and, for email sign-in, a password held by Supabase Auth.</li>
          <li>
            Commission requests: the name and email on the request, the service, package, and add-ons, your brief,
            answers to that service&apos;s questions, and reference files you upload (images or PDFs). Those files are
            stored in a private Supabase Storage folder. The request also keeps the delivery window and revision count
            from the package, the estimate, and a final amount if the request is accepted.
          </li>
          <li>Messages on a request, notes from M J, and files delivered for the commission.</li>
          <li>
            The contact form: name, email, project type, the budget range you choose, and your message. A hidden spam
            field on that form is dropped and is not saved.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Why">
        <p>
          The site uses this information to keep your account, to take and carry out commission orders, and to
          correspond with you on the site and by email.
        </p>
      </LegalSection>

      <LegalSection title="Where it is stored and processed">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            Supabase stores the database (client profiles, contact inquiries, commission requests, and messages),
            authentication, and uploaded commission files.
          </li>
          <li>The site is hosted on Vercel.</li>
          <li>
            Google Analytics is part of the public site, and it loads only when a valid measurement ID is saved in
            site settings. Those pages then include the Google tag provided by Next.js. The tag is not added during
            local development, and it is not added on admin pages. With no valid ID, the tag is not loaded.
          </li>
          <li>
            When email sending is configured, mail about a request is sent through Resend. When it is not configured,
            that mail is not sent.
          </li>
          <li>PayPal processes commission payments. This site does not store card data. See Payments.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Payments">
        <p>
          Commissions are paid through PayPal, by a payment link sent in the messages on your request or by a PayPal
          invoice for that order. When PayPal checkout is switched on, the request page can also send you to PayPal to
          pay. Card details are handled by PayPal. This site does not collect or store card numbers or other card data.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Signing in sets session cookies through Supabase Auth so you can stay signed in. Those cookies are refreshed
          on the account and sign-in routes.
        </p>
        <p>
          When the Google Analytics tag is loaded, Google may set analytics cookies. When the tag is not loaded, this
          site does not set analytics cookies.
        </p>
        <p>
          A light or dark theme choice, and a sound on or off choice, are saved in this browser&apos;s local storage.
          They are not cookies.
        </p>
      </LegalSection>

      <LegalSection title="Retention and deletion">
        <p>
          <FillIn>
            how long accounts, commission requests, messages, uploaded files, contact-form inquiries, and analytics
            data are kept, and what is deleted when someone asks or closes an account
          </FillIn>
        </p>
        <p>
          To ask for a copy, a correction, or deletion, use the contact route at the bottom of this page.
        </p>
        <p>
          <FillIn>
            a postal address, and any privacy law or region to name. The site code does not set either
          </FillIn>
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
