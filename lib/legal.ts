/**
 * Operator details used by /privacy, /terms and /refunds.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REQUIRED BEFORE LAUNCH — the two TODO values below are placeholders, and
 * a production build will FAIL until they are replaced. That is deliberate:
 * see the guard at the bottom of this file.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * These are facts about a business, not something inferable from the code,
 * so they live in one file rather than scattered across three pages. Two of
 * them gate things outside this repo:
 *
 *  - Google OAuth verification wants a reachable privacy-policy URL and a
 *    working contact address before the consent screen can leave testing
 *    mode. A placeholder address fails that review.
 *  - UPI/payment-gateway onboarding (Razorpay, Cashfree, PhonePe for
 *    Business) wants a published refund-and-cancellation policy and the
 *    legal entity name behind the account.
 *
 * The prose in the three pages is accurate about what this application
 * does — it was written from the schema in supabase/migrations, not from a
 * template — but it has NOT been reviewed by a lawyer. Have someone
 * qualified read it, especially the refund terms, which are a commitment to
 * paying advertisers.
 */

const TODO_ENTITY = "TODO: your registered business or proprietor name";
const TODO_EMAIL = "TODO: hello@your-domain.com";

export const LEGAL = {
  /** Registered business or proprietor name that appears on invoices. */
  entityName: process.env.NEXT_PUBLIC_LEGAL_ENTITY?.trim() || TODO_ENTITY,

  /** Where privacy, data-deletion and support mail should go. */
  contactEmail: process.env.NEXT_PUBLIC_LEGAL_EMAIL?.trim() || TODO_EMAIL,

  /** City and state for the governing-law clause. */
  jurisdiction: "Hyderabad, Telangana, India",

  /**
   * Last substantive revision, shown on each page. Update it whenever the
   * terms change — a policy with a stale date reads as abandoned.
   */
  lastUpdated: "2026-10-03",
} as const;

/**
 * Fail the production build rather than publish placeholder legal text.
 *
 * A warning in a build log is missable and the cost of missing this one is
 * a live privacy policy that reads "TODO: your registered business name" —
 * in front of the Google reviewer deciding whether sign-in works and the
 * payment provider deciding whether you can take money. So it is an error,
 * and it surfaces at build time: these three pages are statically
 * prerendered, so this module runs during `next build`.
 *
 * Development is deliberately exempt. Nothing should stop `next dev` on a
 * fresh clone, and the placeholders are legible as placeholders on screen.
 *
 * To satisfy it, either replace the two constants above or set
 * NEXT_PUBLIC_LEGAL_ENTITY and NEXT_PUBLIC_LEGAL_EMAIL in the environment.
 */
if (process.env.NODE_ENV === "production") {
  const unset = [
    LEGAL.entityName === TODO_ENTITY && "NEXT_PUBLIC_LEGAL_ENTITY (or LEGAL.entityName)",
    LEGAL.contactEmail === TODO_EMAIL && "NEXT_PUBLIC_LEGAL_EMAIL (or LEGAL.contactEmail)",
  ].filter(Boolean);

  if (unset.length > 0) {
    throw new Error(
      `lib/legal.ts: refusing to build for production with placeholder legal details.\n` +
        `Still unset: ${unset.join(", ")}.\n` +
        `These appear on /privacy, /terms and /refunds, which Google OAuth verification and ` +
        `payment onboarding both read. Set them and rebuild.`
    );
  }
}
