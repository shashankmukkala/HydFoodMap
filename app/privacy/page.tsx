import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What HydCafeMap collects, why, how long it is kept, and how to have it deleted.",
};

/**
 * Written against supabase/migrations, not from a template — every table
 * and column referred to here is one that actually exists. If the schema
 * changes what is stored, this page is part of that change.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="What we collect, and what we don’t."
      lede="Short version: an account, the places you save, and — only while you are checking in — where your phone says you are."
    >
      <h2>Who this is</h2>
      <p>
        HydCafeMap is operated by {LEGAL.entityName}. For anything on this page, including a request
        to delete your data, write to <strong>{LEGAL.contactEmail}</strong>.
      </p>

      <h2>You can use the map without an account</h2>
      <p>
        Browsing, searching and opening cafe cards needs no sign-in and no account. You only need one
        to save favourites, keep collections, mark places visited, post a review, or appear on the
        leaderboard.
      </p>

      <h2>What we store when you do sign in</h2>
      <p>We sign you in with Google. From that we keep:</p>
      <ul>
        <li>
          Your email address and Google account identifier, held by our authentication provider
          (Supabase Auth) and used to recognise you on your next visit.
        </li>
        <li>
          A display name and the preset avatar you picked. The display name is what appears beside
          your reviews and on the public leaderboard. We do not use your Google profile photo.
        </li>
      </ul>

      <h2>Location</h2>
      <p>
        This is the part worth reading carefully, because it is the most sensitive thing here and the
        reason reviews on this site mean anything.
      </p>
      <p>
        Reviews and visits are only accepted from someone who was actually at the cafe. To check
        that, when <em>you</em> start a check-in, your browser asks your permission and then sends us
        your latitude, longitude and the accuracy figure your device reports. We compare it against
        the cafe’s coordinates, wait out a short dwell period, and ask for the position once more.
      </p>
      <ul>
        <li>
          <strong>It is never passive.</strong> We do not track your location in the background,
          between check-ins, or while you browse the map. Nothing is read unless you tap to start a
          check-in and your browser grants permission.
        </li>
        <li>
          <strong>What is kept.</strong> The coordinates and accuracy from the start of a check-in
          are stored on the check-in record, with the cafe and the timestamps. That is what lets a
          disputed review be re-verified later.
        </li>
        <li>
          <strong>It is never published.</strong> Your coordinates are not shown to other users, not
          attached to your public review, and not sold or shared with advertisers. A review shows a
          “verified visit” badge — the fact, not the position.
        </li>
        <li>
          <strong>The distance filter is separate.</strong> Choosing a “within N km” filter reads
          your position once to sort the list. That reading is not stored at all.
        </li>
      </ul>

      <h2>What else we keep, and why</h2>
      <ul>
        <li>
          <strong>Favourites, collections and visited places</strong> — so they follow you across
          devices instead of living in one browser.
        </li>
        <li>
          <strong>Reviews</strong> — your rating, your written review, an optional favourite dish and
          an optional photo. These are public by design, shown with your display name.
        </li>
        <li>
          <strong>Points</strong> — an append-only ledger of what each verified action earned, which
          is what the leaderboard ranks.
        </li>
        <li>
          <strong>Visits</strong> — which cafes you have been to and when, used for your visited
          count and the repeat-visit reward.
        </li>
        <li>
          <strong>Searches</strong> — the text typed into search and how many results it returned, so
          we can see what people look for and fail to find. This is linked to your account when you
          are signed in.
        </li>
        <li>
          <strong>Notifications</strong> — the in-app messages we have sent you, and whether you have
          read them.
        </li>
      </ul>

      <h2>If you enquire about advertising</h2>
      <p>
        The form on <Link href="/advertise">/advertise</Link> stores the brand name, contact name and
        contact detail you enter, your creative image and destination link, the campaign dates, your
        message, and any payment proof you attach. We use it to price, review and publish the
        campaign, and to keep a record of the transaction. It is not used for anything else.
      </p>

      <h2>Who else sees any of this</h2>
      <p>
        We do not sell personal data and we do not share it with advertisers. It is handled by the
        services that run the product:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — the database and authentication.
        </li>
        <li>
          <strong>Vercel</strong> — hosting, and the server logs that come with it.
        </li>
        <li>
          <strong>Google</strong> — the sign-in itself, and the web fonts the site loads.
        </li>
        <li>
          <strong>Our map tile and address-search providers</strong> — these receive the map area you
          are viewing in order to return tiles, which is inherent to how any map works.
        </li>
      </ul>
      <p>
        We may also disclose data where the law requires it, and we will say so publicly unless we
        are barred from doing so.
      </p>

      <h2>Cookies and storage</h2>
      <p>
        No advertising or analytics cookies. Your browser holds a sign-in session so you are not
        asked to sign in on every page, plus a few local preferences — whether you have dismissed the
        intro banner, for instance. Clearing site data removes those and signs you out.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account data, reviews, visits and points are kept while your account exists. Check-in
        records, including their coordinates, are kept as the evidence behind a review. Search logs
        are kept in aggregate.
      </p>
      <p>
        Reviews cannot be deleted from the interface, deliberately: deleting one used to free the
        one-review-per-cafe slot while its points stayed awarded. If a review of yours is wrong,
        write to us and we will correct or remove it.
      </p>

      <h2>Deleting your data</h2>
      <p>
        Email <strong>{LEGAL.contactEmail}</strong> from the address on your account and we will
        delete the account and everything tied to it — profile, favourites, collections, visits,
        points, check-ins and notifications. Reviews you have already published will be removed or
        detached from your name, your choice. We aim to act within 30 days.
      </p>

      <h2>Children</h2>
      <p>
        This is not a service for children. Do not create an account if you are under 13. If you
        believe a child has, tell us and we will remove it.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that affects what we collect or who sees it, we will update
        the date at the top and say so in the app rather than changing it quietly.
      </p>
    </LegalPage>
  );
}
