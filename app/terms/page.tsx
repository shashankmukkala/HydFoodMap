import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms",
  description: "The rules for using HydCafeMap, posting reviews, and buying advertising.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of use"
      title="The rules, in plain words."
      lede="What you can expect from HydCafeMap, and what we expect from you."
    >
      <h2>Agreement</h2>
      <p>
        Using HydCafeMap means accepting these terms. The service is operated by{" "}
        {LEGAL.entityName}. If you do not accept them, please do not use the site.
      </p>

      <h2>What HydCafeMap is</h2>
      <p>
        An independent guide to cafes, restaurants and breweries in Hyderabad. Listings are
        editorial: a place does not pay to be on the map, and paying for an advertising format never
        changes a listing, a rating or a search result. Sponsored placements are always labelled.
      </p>
      <p>
        We try to keep details — addresses, hours, prices, what a place is known for — correct, but
        they come from a mix of our own research and public sources, and cafes change without
        telling anyone. Check with the place before making a trip that depends on it. Nothing here
        is a guarantee that a venue is open, serving, or priced as shown.
      </p>

      <h2>Your account</h2>
      <p>
        You need a Google account to sign in. Keep it secure; anything done through it is treated as
        done by you. One person, one account — creating extra accounts to collect the signup bonus
        more than once, inflate a leaderboard position, or post more than one review of the same
        place is a misuse of the service, and we may remove the points, the reviews, or the
        accounts.
      </p>

      <h2>Reviews and check-ins</h2>
      <p>This is the part that makes the site different, so the rules are strict.</p>
      <ul>
        <li>
          A review requires a location-verified check-in. You must be at the cafe, stay for a short
          dwell period, and let your browser confirm the position.
        </li>
        <li>
          One review per person per cafe. Reviews cannot be deleted from the interface — write to us
          if one needs correcting.
        </li>
        <li>
          Do not defeat the verification. Spoofing GPS, scripting the check-in flow, or reviewing a
          place on someone else’s behalf will cost you the points and may cost you the account.
        </li>
        <li>
          Write about the place, not the people. No abuse, harassment, slurs, threats, personal
          information about staff or other customers, or content you do not have the right to post.
        </li>
        <li>
          No paid, incentivised or competitor-sabotaging reviews, whether you are the cafe or
          someone writing for one.
        </li>
        <li>
          Photos must be yours, taken at the place. Do not upload anything you did not shoot.
        </li>
      </ul>
      <p>
        You keep ownership of what you post, and you grant us a non-exclusive, royalty-free licence
        to display it on the site and to use it to describe the place. We may remove any review or
        photo that breaks these rules.
      </p>

      <h2>Points and the leaderboard</h2>
      <p>
        Points recognise verified activity. They are not currency, have no cash value, cannot be
        transferred or sold, and are not redeemable unless and until we say otherwise in writing. We
        may change what an action is worth, adjust a balance that was awarded in error or through
        misuse, or retire the system, and we will announce material changes in the app.
      </p>

      <h2>Advertising</h2>
      <p>
        Prices and formats are shown on <Link href="/advertise">/advertise</Link>. Submitting the
        form is an enquiry, not a booking: a campaign only exists once we have confirmed it and it
        has been published. We review every creative and may decline one — most often for a broken
        destination link, misleading claims, unreadable artwork, or content we will not carry
        (alcohol promotions to minors, gambling, tobacco, adult content, political advertising, or
        anything unlawful).
      </p>
      <ul>
        <li>
          You confirm you own the rights to the creative you supply, and that its claims are true.
        </li>
        <li>
          Campaign dates are the dates we agree in writing. We do not currently offer impression or
          click reporting, and placements are not sold on a performance basis.
        </li>
        <li>
          Rail slots are assigned explicitly and only one live ad occupies each. Availability is
          first-come.
        </li>
        <li>
          Refunds and cancellations are covered in the <Link href="/refunds">refund policy</Link>,
          which forms part of these terms.
        </li>
      </ul>

      <h2>Things you may not do</h2>
      <ul>
        <li>Scrape, bulk-download or republish the cafe data as a competing directory.</li>
        <li>
          Hammer the API, bypass rate limits, or try to reach admin functionality you have not been
          given.
        </li>
        <li>Probe, scan or attempt to break the site’s security, or anyone’s account but your own.</li>
        <li>Upload malware, or use the site to deceive anyone.</li>
      </ul>
      <p>
        Found a security flaw? Please report it to <strong>{LEGAL.contactEmail}</strong> before
        telling anyone else. We will not pursue anyone who reports a genuine issue in good faith and
        gives us a reasonable chance to fix it.
      </p>

      <h2>Availability</h2>
      <p>
        We run this as well as we can, but we do not promise it will be uninterrupted or error-free.
        Features may change or be withdrawn. The service is provided as-is, without warranties
        beyond those the law does not let us exclude.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, we are not liable for indirect or consequential loss, lost
        profit, or anything arising from your visit to a venue listed here. Where liability cannot
        be excluded, it is limited to the amount you have paid us in the twelve months before the
        claim — which, for anyone who is not an advertiser, is nothing.
      </p>

      <h2>Suspension</h2>
      <p>
        We may suspend or remove an account that breaks these terms, with notice where that is
        practical and without it where the misuse is ongoing. You can stop using the service at any
        time and ask us to delete your account — see the{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of India, and the courts of {LEGAL.jurisdiction} have
        exclusive jurisdiction over any dispute.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The date at the top shows the last substantive revision, and
        continuing to use the site after a change means accepting it.
      </p>

      <h2>Contact</h2>
      <p>
        <strong>{LEGAL.contactEmail}</strong>
      </p>
    </LegalPage>
  );
}
