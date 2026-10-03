"use client";

import Link from "next/link";
import PageBanner from "@/components/PageBanner";
import SiteFooter from "@/components/SiteFooter";
import { UPI } from "@/lib/payments";
import { useState } from "react";

type AdFormat = "map_rail" | "billboard" | "aircraft";

const FORMAT_DETAILS: Record<AdFormat, { label: string; description: string }> = {
  map_rail: { label: "Five-slot map rail", description: "A compact sponsored presence in the centre of the Hyderabad map." },
  billboard: { label: "3D map billboard", description: "A landmark placement that lives at a chosen point on the map." },
  aircraft: { label: "Aircraft banner", description: "A high-attention banner that flies across the map without a location pin." },
};

const FORMAT_PRICES: Record<AdFormat, { amount: string; duration: string }> = {
  map_rail: { amount: "₹1,000", duration: "for all 5 slots" },
  billboard: { amount: "₹3,000", duration: "per campaign" },
  aircraft: { amount: "₹3,000", duration: "per campaign" },
};

export default function AdvertisePage() {
  const [format, setFormat] = useState<AdFormat>("map_rail");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/ad-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form.entries()), ad_format: format }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit enquiry.");
      setStatus("success");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit enquiry.");
      setStatus("error");
    }
  }

  return (
    <main className="advertise-page">
      <PageBanner
        active="advertise"
        eyebrow="Advertise with us"
        title="Put your brand in Hyderabad’s city view."
        lede="Reach people while they are choosing where to eat, meet, work and unwind."
      />
      <div className="advertise-layout">
        <section className="advertise-intro">
          <span className="ad-rail-kicker">How it works</span>
          <div className="advertise-proof-list mt-4">
            <div><span>01</span><strong>Choose your format</strong><small>Rail, billboard, or aircraft.</small></div>
            <div><span>02</span><strong>Send your creative</strong><small>We review every placement.</small></div>
            <div><span>03</span><strong>Go live with confidence</strong><small>Your ad launches after approval.</small></div>
          </div>
        </section>

        <section className="advertise-form-card">
          {status === "success" ? (
            <div className="advertise-success">
              <div className="ad-enquiry-success-icon">✓</div>
              <span className="ad-rail-kicker">ENQUIRY RECEIVED</span>
              <h2>Your brand is on our radar.</h2>
              <p>We&apos;ll review your request and contact you before anything goes live.</p>
              <Link href="/map" className="ad-enquiry-primary px-5">Return to map</Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="advertise-form-heading">
                <div><span className="ad-rail-kicker">START A CAMPAIGN</span><h2>Tell us about your placement.</h2></div>
                <span className="advertise-step">1 / 2</span>
              </div>

              <label>Ad format<select value={format} onChange={(event) => setFormat(event.target.value as AdFormat)}><option value="map_rail">Five-slot map rail</option><option value="billboard">3D map billboard</option><option value="aircraft">Aircraft banner</option></select></label>
              <div className="advertise-format-note"><div><strong>{FORMAT_DETAILS[format].label}</strong><span>{FORMAT_DETAILS[format].description}</span></div><b>{FORMAT_PRICES[format].amount}<small>{FORMAT_PRICES[format].duration}</small></b></div>

              <div className="advertise-field-grid">
                <label>Brand or cafe name<input name="brand_name" required placeholder="Roast 24 Seven" /></label>
                <label>Contact person<input name="contact_name" required placeholder="Your name" /></label>
              </div>
              <label>Phone or email<input name="contact" required placeholder="you@example.com or +91..." /></label>
              <div className="advertise-field-grid">
                <label>Banner image URL<input name="image_url" type="url" placeholder="https://..." /></label>
                <label>Destination URL<input name="target_url" type="url" placeholder="https://yourbrand.com" /></label>
              </div>

              {format === "billboard" && <div className="advertise-inline-note">Billboards are placed at an agreed map location after review. Our team will confirm dimensions and orientation with you.</div>}
              {format === "aircraft" && <div className="advertise-inline-note">Aircraft banners move across the map and do not require a pin or fixed location.</div>}

              <div className="advertise-field-grid"><label>Start date<input name="campaign_start" type="date" /></label><label>End date<input name="campaign_end" type="date" /></label></div>
              <label>Campaign notes<textarea name="message" rows={3} placeholder="Tell us what you want people to notice..." /></label>
              {/* Only rendered once a real VPA is configured — see
                  lib/payments.ts. Until then the form says what actually
                  happens (we confirm the slot, then send payment details)
                  rather than showing a placeholder QR beside a real price. */}
              {UPI.configured ? (
                <div className="advertise-payment">
                  <div className="advertise-payment-heading"><div><span className="ad-rail-kicker">STEP 2 · PAYMENT</span><h3>Pay {FORMAT_PRICES[format].amount} via UPI</h3></div><span className="advertise-payment-badge">UPI</span></div>
                  <div className="advertise-payment-body">
                    {UPI.qrUrl ? (
                      /* A plain <img>: the QR is an operator-supplied file of
                         unknown dimensions, and next/image would need them
                         up front. It must also never be resampled — a
                         re-encoded QR can stop scanning. */
                      // eslint-disable-next-line @next/next/no-img-element -- see above: unknown dimensions, and a re-encoded QR can stop scanning
                      <img src={UPI.qrUrl} alt={`UPI QR code for ${UPI.payeeName ?? "HydCafeMap"}`} className="advertise-qr" />
                    ) : (
                      <div className="advertise-qr-placeholder"><span>UPI</span><small>Pay to the ID shown</small></div>
                    )}
                    <div>
                      <strong>Scan or pay to this UPI ID</strong>
                      <p>Pay {FORMAT_PRICES[format].amount} with any UPI app, then paste the screenshot link below.</p>
                      <code>{UPI.id}</code>
                      {UPI.payeeName && <p>Your app should show the payee as {UPI.payeeName}.</p>}
                    </div>
                  </div>
                  <label>Payment proof URL<input name="payment_proof_url" type="url" placeholder="Paste screenshot link (optional for now)" /></label>
                </div>
              ) : (
                <div className="advertise-inline-note">
                  We&apos;ll confirm availability for your dates first, then send payment details — nothing
                  is charged when you submit this form.
                </div>
              )}
              <label className="advertise-check"><input type="checkbox" required /> <span>I confirm I&apos;m authorised to advertise this brand and agree to manual review.</span></label>
              {status === "error" && <div className="ad-enquiry-error">{error}</div>}
              <button type="submit" className="ad-enquiry-primary" disabled={status === "sending"}>{status === "sending" ? "Submitting…" : "Submit for review"}</button>
              <small className="advertise-footnote">
                {UPI.configured
                  ? "Submitting this form is an enquiry, not a booking — we review every placement before it goes live."
                  : "No payment is collected at this stage. We'll contact you with availability and pricing."}{" "}
                See our <Link href="/refunds">refund policy</Link>.
              </small>
            </form>
          )}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
