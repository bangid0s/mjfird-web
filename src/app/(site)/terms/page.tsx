import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument, { LegalList, LegalSection, LegalTable, SectionRef, Term } from "@/components/legal/LegalDocument";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms of service for orders with FiRD Creative Studio (M.J Fird): ordering, payment, revisions, delivery, refunds, usage rights, content policy and retainers.",
};

const linkClass =
  "text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-accent hover:decoration-accent";

export default async function TermsPage() {
  const settings = await getSiteSettings();
  const email = settings.contactEmail || "info@mjfird.com";
  const emailLink = (
    <a href={`mailto:${email}`} className={linkClass}>
      {email}
    </a>
  );

  return (
    <LegalDocument
      eyebrow="Terms"
      title="Terms of service & client policies"
      updated="10 November 2026"
      contactEmail={settings.contactEmail}
      related={{ href: "/privacy", label: "Privacy policy" }}
    >
      <LegalSection id="section-1" title="1. About these terms">
        <p>
          By placing an order, paying an invoice, or using mjfird.com, you agree to these terms. They apply to every
          direct order with <Term>FiRD Creative Studio</Term>, operated by Mohammad Jamaluddin Firdaus (&ldquo;M.J
          Fird&rdquo;, &ldquo;I&rdquo;, &ldquo;me&rdquo;) in Semarang, Indonesia.
        </p>
        <LegalList>
          <li>
            <Term>Which terms win:</Term>{" "}a signed contract or quotation for your project comes first, then any terms on
            a specific service page, then this page.
          </li>
          <li>
            <Term>Platform orders:</Term>{" "}orders placed on third-party platforms such as VGen follow that
            platform&apos;s terms.
          </li>
          <li>
            <Term>Changes:</Term>{" "}I may update these terms. The version published on the day you place your order
            applies to that order.
          </li>
          <li>
            <Term>Age:</Term>{" "}you must be 18 or older to order, or have a parent or guardian place the order for you.
            Mature content is only for clients aged 18+.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="section-2" title="2. Services covered">
        <p>These terms cover four kinds of work. Each order states which one it is.</p>
        <LegalTable
          caption="Services covered and their default rights"
          head={["Service", "Examples", "Default rights (see section 8)"]}
          rows={[
            [
              "Illustration commissions",
              "D&D characters, custom MTG card art, Pokémon trainer cards, VTuber character art, character and scene illustration",
              "Personal use license",
            ],
            [
              "YCH and ready-made items",
              "YCH (“Your Character Here”) pieces, Twitch/Discord emote packs",
              "Personal use license, including use on your own streams",
            ],
            [
              "Graphic design",
              "T-shirt and merch design, brand identity, event branding, business cards",
              "Commercial use, copyright transfers after full payment",
            ],
            [
              "Website development",
              "Company profile sites with CMS, domain, hosting and maintenance",
              "Set in a separate project quotation and agreement",
            ],
          ]}
        />
        <p>
          Website projects always have their own written quotation covering scope, hosting, domain renewals and
          maintenance. Where that quotation is silent, these terms apply.
        </p>
      </LegalSection>

      <LegalSection id="section-3" title="3. How ordering works">
        <p>
          An order is confirmed only when I accept your request <Term>and</Term>{" "}your first payment is received.
          Submitting a request is free and does not reserve a slot.
        </p>
        <LegalList ordered>
          <li>
            <Term>Request.</Term>{" "}Pick a service, package and add-ons on mjfird.com, or contact me by email or on the
            Fird Studio Discord. The price shown is an estimate.
          </li>
          <li>
            <Term>Review.</Term>{" "}I reply within 2 working days to accept, ask questions, or decline. I may decline any
            request without giving a reason.
          </li>
          <li>
            <Term>Quotation.</Term>{" "}I send the final price, scope, number of revisions and estimated delivery. A
            quotation is valid for 14 days.
          </li>
          <li>
            <Term>Payment.</Term>{" "}You pay the invoice (see <SectionRef n={4} />). Your slot is reserved once payment
            clears.
          </li>
          <li>
            <Term>Brief.</Term>{" "}You confirm the brief: references, intended use, size, deadline. Work starts within 7
            days of payment unless we agree another date.
          </li>
          <li>
            <Term>Sketch → approval → render.</Term>{" "}I share watermarked progress at each stage for your feedback (see{" "}
            <SectionRef n={5} />
            ).
          </li>
          <li>
            <Term>Delivery.</Term>{" "}Final files are sent once everything is paid.
          </li>
        </LegalList>
        <p>
          What goes in the quotation is what you get. Anything added later, such as an extra character, a background or
          a new format, is a change of scope and is quoted separately.
        </p>
      </LegalSection>

      <LegalSection id="section-4" title="4. Pricing and payment">
        <p>No work starts before the first payment. The payment schedule depends on the order total.</p>
        <LegalTable
          caption="Payment schedule by order total"
          head={["Order total", "Schedule"]}
          rows={[
            ["Under USD 150 / Rp 2.500.000", "100% upfront"],
            ["USD 150–1,000 / Rp 2.500.000–15.000.000", "50% deposit to start, 50% before final files are sent"],
            ["Over USD 1,000 / Rp 15.000.000", "Milestones, usually 40% / 30% / 30%, set in the quotation"],
          ]}
        />
        <LegalList>
          <li>
            <Term>Currency:</Term>{" "}international clients pay in USD; Indonesian clients may pay in IDR. The invoice
            states one currency.
          </li>
          <li>
            <Term>Methods:</Term>{" "}PayPal invoice or payment link for USD; bank transfer for IDR. Other methods only by
            written agreement.
          </li>
          <li>
            <Term>Fees:</Term>{" "}transfer and conversion fees are paid by the client, so I receive the invoiced amount in
            full.
          </li>
          <li>
            <Term>Late payment:</Term>{" "}if a milestone payment is more than 7 days late, work pauses. After 30 days the
            order may be cancelled under <SectionRef n={7} />.
          </li>
          <li>
            <Term>Price changes:</Term>{" "}prices on the site can change at any time. Your quoted price is locked once you
            pay.
          </li>
          <li>
            <Term>Rush orders:</Term>{" "}delivery faster than the standard estimate costs an extra 30–50%, only if my
            schedule allows.
          </li>
          <li>
            <Term>Chargebacks:</Term>{" "}opening a payment dispute without contacting me first ends the order and cancels
            any license to the work.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="section-5" title="5. Revisions">
        <p>
          Each package includes a set number of free revisions, stated in the quotation. Big changes are cheapest at the
          sketch stage, so that is where most feedback should go.
        </p>
        <LegalTable
          caption="Revisions included at each stage"
          head={["Stage", "Included", "What can change"]}
          rows={[
            ["Sketch", "Up to 2 rounds", "Pose, composition, expression, outfit details, layout"],
            ["Line art and color", "1 round", "Small fixes: colors, small details, minor anatomy or text corrections"],
            [
              "After final delivery",
              "None",
              "Only my own mistakes against the approved brief, fixed free within 7 days",
            ],
          ]}
        />
        <LegalList>
          <li>
            <Term>One revision</Term>{" "}= one message listing all changes for that stage. Changes sent across several
            messages count as several rounds.
          </li>
          <li>
            <Term>Major changes</Term>{" "}after the sketch is approved (new pose, new character design, new composition)
            are charged as extra work or a new sketch.
          </li>
          <li>
            <Term>Extra rounds</Term>{" "}cost 10–25% of the base price each, depending on size, and I tell you the price
            before starting.
          </li>
          <li>
            <Term>Approval:</Term>{" "}saying &ldquo;approved&rdquo;, &ldquo;looks good&rdquo;, or moving to the next
            stage counts as approval of that stage.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="section-6" title="6. Timeline and delivery">
        <p>
          The delivery estimate in your quotation counts working days (Monday to Friday, Western Indonesia Time,
          excluding Indonesian public holidays). It starts when payment clears and the brief is complete.
        </p>
        <LegalList>
          <li>
            <Term>Typical estimates:</Term>{" "}7–21 working days for illustration, 5–14 for design, per quotation for
            websites. These are estimates, not guarantees, unless the quotation names a fixed deadline.
          </li>
          <li>
            <Term>Your feedback time:</Term>{" "}please reply to each progress check within 7 days. The clock pauses while I
            wait for you.
          </li>
          <li>
            <Term>No response:</Term>{" "}after 14 days without a reply I may treat the stage as approved and continue.
            After 60 days the order closes; payments for stages already done are not refunded.
          </li>
          <li>
            <Term>My delays:</Term>{" "}if I will miss a date, I tell you before it passes. If I am more than 14 days late
            without your agreement, you may cancel and get back the unfinished portion of your payment.
          </li>
          <li>
            <Term>Files:</Term>{" "}high-resolution PNG or JPG, plus print formats where needed (CMYK PDF, 300 dpi). Design
            orders include the vector or source files listed in the quotation.
          </li>
          <li>
            <Term>Not included unless bought as an add-on:</Term>{" "}layered source files (PSD, CLIP), time-lapse or
            process videos, raw sketches, extra sizes or crops.
          </li>
          <li>
            <Term>Watermarks:</Term>{" "}all progress images are watermarked and low resolution. Clean files are released
            after full payment.
          </li>
          <li>
            <Term>Keep your files:</Term>{" "}download and back up your files on delivery. I keep copies for 6 months but
            cannot promise long-term storage.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="section-7" title="7. Cancellation and refunds">
        <p>
          The more work is done, the less can be refunded. Refunds are counted from the full order price and sent back
          by the original payment method, less any transfer fees.
        </p>
        <LegalTable
          caption="Refund by stage of cancellation"
          head={["Stage when you cancel", "Refund"]}
          rows={[
            ["Before payment (pending review or awaiting payment)", "Nothing to refund; cancel from your account"],
            ["Paid, work not started", "100%"],
            ["Sketch in progress", "70%"],
            ["Sketch delivered or approved", "50%"],
            ["Line art or color in progress", "20%"],
            ["Final files delivered", "No refund"],
          ]}
        />
        <LegalList>
          <li>
            <Term>If I cancel</Term>{" "}for any reason other than your breach of these terms, you get back everything you
            paid for work not yet delivered.
          </li>
          <li>
            <Term>If I cancel because of your breach</Term>{" "}(abuse, non-payment, a content policy violation, a
            chargeback), no refund is due for work already done.
          </li>
          <li>
            <Term>Ready-made items</Term>{" "}(YCH slots, emote bases) can be refunded only before I start customizing them.
          </li>
          <li>
            <Term>Websites:</Term>{" "}domain and hosting costs already paid to third parties are not refundable.
          </li>
          <li>
            <Term>Not a reason for a refund:</Term>{" "}a change of mind about a stage you already approved, or dislike of a
            style that matches my portfolio.
          </li>
          <li>
            <Term>How to cancel</Term>{" "}once work has started: message me on your order or email {emailLink}. Refunds are
            sent within 14 days.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="section-8" title="8. Ownership, licensing and usage rights">
        <p>
          For illustration, I keep the copyright and you get a license to use the work. For design work made for your
          business, the copyright is yours after full payment. No rights pass to you until the order is paid in full.
        </p>
        <LegalTable
          caption="License types"
          head={["License", "Included with", "You may", "You may not"]}
          rows={[
            [
              "Personal use",
              "All illustration, YCH and emote orders",
              "Profile pictures, personal prints, your own social posts (with credit), your D&D table or game night, your own streams and VTuber channel, including monetized streams",
              "Sell it, put it on merch, use it in ads, or use it for a business or brand",
            ],
            [
              "Commercial use",
              "Paid add-on, +50% to +100% of base price",
              "The uses listed in the quotation: merch, book or album covers, games, ads, crowdfunding, with the print run or platform agreed",
              "Resell the artwork itself, or use it beyond the agreed scope",
            ],
            [
              "Full transfer",
              "All graphic design orders (logo, brand identity, merch design); illustration only by separate quote",
              "Own the copyright and use, edit and register it as you wish",
              "—",
            ],
          ]}
        />
        <p>
          <Term>Rights I keep, unless we agree otherwise in writing:</Term>
        </p>
        <LegalList>
          <li>
            Showing the work in my portfolio, social media, website and print portfolio, credited to you if you wish.
          </li>
          <li>Sharing process images and using the piece in promotional material for my services.</li>
          <li>
            For confidential projects, a non-disclosure agreement or a delayed posting date can be added, usually for an
            extra fee.
          </li>
        </LegalList>
        <p>
          <Term>Rules for all licenses:</Term>
        </p>
        <LegalList>
          <li>
            <Term>Credit:</Term>{" "}please credit &ldquo;Art by M.J Fird&rdquo; or @m.j.fird when you post the work.
          </li>
          <li>
            <Term>No AI use:</Term>{" "}you may not use the work to train, fine-tune or prompt AI models, or to make AI
            variations of it.
          </li>
          <li>
            <Term>No NFTs or tokens</Term>{" "}without a commercial license that names them.
          </li>
          <li>
            <Term>Don&apos;t remove my signature</Term>{" "}or claim the work as your own.
          </li>
          <li>
            <Term>Fan art</Term>{" "}of characters owned by others (for example Pokémon or Magic: The Gathering) is for
            personal use only. I cannot sell a commercial license to a character I don&apos;t own.
          </li>
          <li>
            <Term>MTG alters and custom cards</Term>{" "}are for casual play and display. They are not official cards and
            must not be sold as such.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="section-9" title="9. Content policy">
        <p>
          I decide what I draw. I may decline or stop any order that breaks this policy; if I stop one,{" "}
          <SectionRef n={7} /> applies.
        </p>
        <LegalTable
          caption="What I will and won't draw"
          head={["I will draw", "I won't draw"]}
          rows={[
            [
              "Original characters, OCs and personas",
              "Any sexual or suggestive content involving minors, or characters who look or are described as underage",
            ],
            ["Fan art for personal use", "Sexual or degrading content of real people"],
            [
              "Fantasy violence, battle scenes, mild gore",
              "Hate symbols, harassment, or content attacking a group of people",
            ],
            ["D&D, TCG and game characters", "Copies or traces of another artist's artwork"],
            ["VTuber characters and scenes", "Logos or designs meant to imitate another brand"],
            [
              "Mature or suggestive art, only for verified 18+ clients and clearly adult characters",
              "Anything illegal in Indonesia or the client's country",
            ],
          ]}
        />
        <p>
          For mature orders I may ask you to confirm your age. Mature work is never shown in my public portfolio without
          your permission.
        </p>
      </LegalSection>

      <LegalSection id="section-10" title="10. Retainer and annual contracts">
        <p>
          For clients who need art or design every month, I offer retainers with a fixed monthly fee, a priority slot in
          my queue, and a lower rate than one-off orders. Every retainer has its own signed agreement; this section sets
          the defaults.
        </p>
        <LegalList>
          <li>
            <Term>Term:</Term>{" "}12 months is standard. 6-month terms are possible at a smaller discount.
          </li>
          <li>
            <Term>What&apos;s included:</Term>{" "}a fixed monthly quota, counted either in pieces (for example 2 full
            illustrations or 6 social graphics) or in hours.
          </li>
          <li>
            <Term>Rate:</Term>{" "}10–20% below my one-off prices, depending on term and volume.
          </li>
          <li>
            <Term>Billing:</Term>{" "}invoiced at the start of each month, paid by the 5th. Work for that month starts once
            paid.
          </li>
          <li>
            <Term>Unused quota:</Term>{" "}rolls over for one month only, then expires.
          </li>
          <li>
            <Term>Extra work:</Term>{" "}anything above the quota is billed at the retainer rate.
          </li>
          <li>
            <Term>Turnaround:</Term>{" "}retainer work is scheduled ahead of one-off orders. Exact delivery times are set in
            the agreement.
          </li>
          <li>
            <Term>Rights:</Term>{" "}each piece follows <SectionRef n={8} /> unless the agreement grants commercial use for
            all work, which is common for brand retainers.
          </li>
          <li>
            <Term>Ending early:</Term>{" "}either side may end the contract with 30 days&apos; written notice. If the client
            ends a 12-month contract before month 6, a fee equal to one month&apos;s retainer applies.
          </li>
          <li>
            <Term>Changes:</Term>{" "}changes to scope or rate are made in a written addendum signed by both sides.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="section-11" title="11. Client responsibilities and communication">
        <p>A clear brief and quick feedback are the two things that keep a project on time.</p>
        <LegalList>
          <li>
            <Term>Brief:</Term>{" "}give accurate references, sizes, intended use and deadlines before work starts. Work
            based on a wrong brief is not my mistake.
          </li>
          <li>
            <Term>References:</Term>{" "}only send images you have the right to share. You are responsible for logos,
            photos or characters you ask me to include.
          </li>
          <li>
            <Term>One contact person:</Term>{" "}for businesses, one person gives feedback and approvals.
          </li>
          <li>
            <Term>Channels:</Term>{" "}official communication is by email ({emailLink}
            ), the order page on mjfird.com, or the Fird Studio Discord server. Agreements made elsewhere must be
            confirmed in one of these.
          </li>
          <li>
            <Term>My reply time:</Term>{" "}within 2 working days, usually faster.
          </li>
          <li>
            <Term>Respect:</Term>{" "}abusive or threatening messages end the order under <SectionRef n={7} />.
          </li>
          <li>
            <Term>No generative AI:</Term>{" "}I don&apos;t use generative AI to create final artwork. Every piece is drawn
            by hand, digitally.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="section-12" title="12. Accounts and website use">
        <p>
          Use your own name and email, and keep one account per person. You are responsible for anything done with your
          login.
        </p>
        <LegalList>
          <li>Don&apos;t misuse the site: no spam, scraping, attacks, fake orders, or harassment of anyone through it.</li>
          <li>
            I may suspend or close an account that breaks these terms. I will tell you by email why, and you can reply to
            dispute it. Paid orders already in progress are finished or refunded under <SectionRef n={7} />.
          </li>
          <li>
            All artwork on mjfird.com belongs to me or to the clients named with it. Don&apos;t download, repost or use
            it without permission.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="section-13" title="13. Liability, disputes and governing law">
        <p>My total liability for any order is limited to the amount you paid for that order.</p>
        <LegalList>
          <li>
            <Term>Indirect losses:</Term>{" "}I&apos;m not liable for lost income, lost business or other indirect losses
            from using the site or a finished piece.
          </li>
          <li>
            <Term>Your use of the work:</Term>{" "}you are responsible for how you use the delivered files, including any
            trademarks, characters or third-party material you asked me to include.
          </li>
          <li>
            <Term>Force majeure:</Term>{" "}delays caused by events outside my control (illness, natural disaster, power or
            internet outages, platform shutdowns) pause the timeline. If a delay lasts over 30 days, either side may
            cancel under <SectionRef n={7} />.
          </li>
          <li>
            <Term>Disputes:</Term>{" "}we first try to settle any problem by talking for 14 days. If that fails, either side
            may go to mediation or to court.
          </li>
          <li>
            <Term>Governing law:</Term>{" "}these terms follow the laws of the Republic of Indonesia. Courts in Semarang
            (Pengadilan Negeri Semarang) have jurisdiction.
          </li>
          <li>
            Liability that cannot legally be limited, including consumer rights under Indonesian law, is not affected.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="section-14" title="14. Privacy">
        <p>
          How personal data is collected and used is covered in the{" "}
          <Link href="/privacy" className={linkClass}>
            privacy policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
