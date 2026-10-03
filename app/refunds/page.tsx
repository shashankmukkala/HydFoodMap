import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refunds & cancellations",
  description:
    "When an advertising payment on HydCafeMap is refunded, when it is not, and how long it takes.",
};

/**
 * Payment onboarding (Razorpay, Cashfree, PhonePe for Business and the
 * rest) will not approve an account without a published refund and
 * cancellation policy, and it has to be reachable without signing in —
 * which is why this is its own route rather than a section of /terms, and
 * why SiteFooter links it from /advertise.
 *
 * The windows and timings below are a commitment to paying advertisers.
 * They are written to match the manual review-then-publish flow the admin
 * console actually implements; if that flow becomes automatic, these change
 * with it.
 */
export default function RefundsPage() {
  return (
    <LegalPage
      eyebrow="Refunds & cancellations"
      title="When you get your money back."
      lede="Advertising on HydCafeMap is reviewed by a person before it goes live, which means there is a clear point before which a refund is simple."
    >
      <h2>What this covers</h2>
      <p>
        Payments for advertising placements — the five-slot map rail, the 3D map billboard and the
        aircraft banner — as priced on <Link href="/advertise">/advertise</Link>. Nothing else on
        HydCafeMap is paid: browsing, accounts, reviews and points are free, so there is nothing
        there to refund.
      </p>

      <h2>How a booking works</h2>
      <p>
        Submitting the enquiry form is not a purchase. We review the creative, the destination link
        and the dates, confirm the slot is free, and only then publish the placement. A campaign is
        live from the moment it appears on the map.
      </p>

      <h2>Full refund</h2>
      <ul>
        <li>
          <strong>We decline your campaign.</strong> If we reject the creative or cannot give you the
          slot or dates you paid for, you get everything back. No deduction.
        </li>
        <li>
          <strong>You cancel before it goes live.</strong> Full refund, as long as you tell us before
          we publish the placement.
        </li>
        <li>
          <strong>We never ran it.</strong> If the campaign does not appear for its agreed dates
          because of something on our side, you get everything back.
        </li>
        <li>
          <strong>You were charged twice,</strong> or charged the wrong amount.
        </li>
      </ul>

      <h2>Partial refund</h2>
      <ul>
        <li>
          <strong>We take it down early.</strong> If we remove a live campaign for a reason that is
          not your fault, you get back the unused share of the campaign period, calculated by day.
        </li>
        <li>
          <strong>Extended outage.</strong> If the placement is not visible for more than 48
          consecutive hours because of a fault on our side, we extend the campaign by the lost time,
          or refund that share if you would rather.
        </li>
      </ul>

      <h2>No refund</h2>
      <ul>
        <li>
          <strong>You cancel after it is live.</strong> The slot was held, the placement ran, and the
          inventory for those dates cannot be sold again.
        </li>
        <li>
          <strong>The campaign underperformed.</strong> Placements are sold for a position and a
          period, not for a number of impressions, clicks or sales. We do not currently offer
          performance reporting and do not sell on a performance basis.
        </li>
        <li>
          <strong>Your own creative or link was wrong</strong> — a broken destination URL, the wrong
          artwork, a typo you approved. Tell us and we will swap the creative at no charge, but the
          period already run is not refunded.
        </li>
        <li>
          <strong>We removed it because it broke the <Link href="/terms">terms</Link></strong> —
          misleading claims, rights you did not hold, or prohibited content.
        </li>
      </ul>

      <h2>How to ask</h2>
      <p>
        Email <strong>{LEGAL.contactEmail}</strong> from the address on the enquiry, with the brand
        name and the approximate date of payment. That is enough for us to find it.
      </p>
      <ul>
        <li>We will acknowledge within 2 working days.</li>
        <li>We will decide within 7 working days, and tell you why.</li>
        <li>
          An approved refund is sent within 7 working days of that decision, by the same route the
          payment arrived. For UPI that usually lands within 3 working days; your bank controls the
          last step.
        </li>
      </ul>

      <h2>Cancelling a campaign</h2>
      <p>
        Write to the same address. If we have not published yet, we stop and refund in full. If it
        is already live, we can take it down on request, but the terms above apply.
      </p>

      <h2>Disputes</h2>
      <p>
        If you are unhappy with a decision, reply and ask for it to be reviewed again — please do
        that before raising a chargeback, which freezes the matter and takes far longer for both of
        us. Anything unresolved is governed by the laws of India, with the courts of{" "}
        {LEGAL.jurisdiction} having exclusive jurisdiction.
      </p>

      <h2>Contact</h2>
      <p>
        {LEGAL.entityName}
        <br />
        <strong>{LEGAL.contactEmail}</strong>
      </p>
    </LegalPage>
  );
}
