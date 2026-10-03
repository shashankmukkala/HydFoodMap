/**
 * UPI collection details for the /advertise page.
 *
 * These are read from the environment rather than written into the page
 * because the page previously shipped literal developer placeholders — a
 * grey box reading "Paste QR here", the words "Replace these details", and
 * `your-upi-id@bank` — directly above real prices. Anyone who opened
 * /advertise saw them, which is worse than showing no payment step at all:
 * it makes a product that is asking for ₹3,000 look unfinished at exactly
 * the moment it is asking to be trusted with money.
 *
 * Unset is now a supported state, not a broken one. With no UPI configured
 * the form drops the payment step and says we will send details once the
 * slot is confirmed — which is the truth about the current flow anyway,
 * since every enquiry is reviewed and published by hand before anything
 * goes live. Setting the two variables below turns the step back on.
 *
 * NEXT_PUBLIC_ is correct here: a UPI VPA is a payment address meant to be
 * displayed to a payer, like a bank account number on an invoice. It is not
 * a secret. The service-role key is the thing that must never be public.
 */

/** e.g. "hydcafemap@okhdfcbank" — the VPA payers scan or type. */
const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID?.trim() || null;

/**
 * Path or URL of the QR image, e.g. "/upi-qr.png" for a file in public/.
 * Optional: a configured VPA with no QR still shows a usable payment step,
 * since any UPI app accepts a typed address.
 */
const UPI_QR_URL = process.env.NEXT_PUBLIC_UPI_QR_URL?.trim() || null;

/** Who the payment lands with, shown next to the VPA so a payer can check
 *  the name their UPI app displays matches what we claim. */
const UPI_PAYEE_NAME = process.env.NEXT_PUBLIC_UPI_PAYEE_NAME?.trim() || null;

export const UPI = {
  id: UPI_ID,
  qrUrl: UPI_QR_URL,
  payeeName: UPI_PAYEE_NAME,
  /** Whether the payment step can honestly be shown. */
  configured: UPI_ID !== null,
} as const;
