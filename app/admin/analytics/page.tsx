"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGate from "@/components/AdminGate";
import { useAdminAuth } from "@/lib/useAdminAuth";
import type { AdminAnalytics } from "@/app/api/admin/analytics/route";

export default function AdminAnalyticsPage() {
  return (
    <AdminGate>
      <Analytics />
    </AdminGate>
  );
}

type Tab = "overview" | "search" | "cafes" | "categories";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "search", label: "Search demand" },
  { key: "cafes", label: "Cafe performance" },
  { key: "categories", label: "Categories" },
];

function Analytics() {
  const { session } = useAdminAuth();
  const accessToken = session?.access_token ?? null;
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(body.error || "Couldn't load analytics.");
        setData(body);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load analytics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-5 py-4 backdrop-blur">
        <div>
          <Link href="/admin" className="text-xs text-ink-muted hover:underline">
            ← Back to map
          </Link>
          <h1 className="mt-1 text-[28px] leading-tight">Analytics</h1>
          <p className="text-xs text-ink-muted">Cafes, visits, and search demand — last 30 days of search activity</p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-5">
        {loading && <div className="admin-enquiries-empty">Loading…</div>}
        {error && !loading && <div className="admin-enquiries-empty">{error}</div>}

        {!loading && !error && data && (
          <>
            <div className="analytics-tabs">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`analytics-tab ${tab === t.key ? "analytics-tab-active" : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <>
                <div className="kpi-grid">
                  <KpiCard label="Cafes" value={data.totals.cafes} />
                  <KpiCard label="Avg rating" value={data.totals.avgRating ?? "—"} />
                  <KpiCard label="Reviews" value={data.totals.reviews} />
                  <KpiCard label="Visits logged" value={data.totals.visits} />
                  <KpiCard label="Bookmarks" value={data.totals.bookmarks} />
                  <KpiCard label="Users" value={data.totals.users} />
                  <KpiCard label="Searches (30d)" value={data.totals.searches} />
                  <KpiCard label="Zero-result searches" value={data.totals.zeroResultSearches} accent="warn" />
                </div>

                <AnalyticsSection kicker="PERFORMANCE" title="Most visited cafes">
                  {data.topVisited.length === 0 ? (
                    <p className="admin-enquiries-empty">No visits logged yet.</p>
                  ) : (
                    <RankedBars items={data.topVisited.map((c) => ({ label: c.name, value: c.count }))} />
                  )}
                </AnalyticsSection>

                {data.searchesByDay.length > 0 && (
                  <AnalyticsSection kicker="TREND" title="Searches per day" subtitle="Last 30 days">
                    <DayBars items={data.searchesByDay} />
                  </AnalyticsSection>
                )}
              </>
            )}

            {tab === "search" && (
              <>
                <AnalyticsSection
                  kicker="DEMAND"
                  title="What people are searching for"
                  subtitle="Top terms typed in the search box, last 30 days"
                >
                  {data.topSearchTerms.length === 0 ? (
                    <p className="admin-enquiries-empty">No searches logged yet.</p>
                  ) : (
                    <RankedBars
                      items={data.topSearchTerms.map((t) => ({ label: t.query, value: t.count, hint: `avg ${t.avgResults} results` }))}
                    />
                  )}
                </AnalyticsSection>

                <AnalyticsSection
                  kicker="OPPORTUNITY"
                  title="Searches that found nothing"
                  subtitle="Unmet demand — a gap to fill, a cafe to court, or an ad slot to sell"
                >
                  {data.zeroResultSearchTerms.length === 0 ? (
                    <p className="admin-enquiries-empty">Every recent search found at least one match.</p>
                  ) : (
                    <RankedBars items={data.zeroResultSearchTerms.map((t) => ({ label: t.query, value: t.count }))} accent="warn" />
                  )}
                </AnalyticsSection>
              </>
            )}

            {tab === "cafes" && (
              <>
                <AnalyticsSection kicker="PERFORMANCE" title="Highest rated" subtitle="Cafes with 2+ reviews">
                  {data.topRated.length === 0 ? (
                    <p className="admin-enquiries-empty">Not enough reviewed cafes yet.</p>
                  ) : (
                    <RankedBars
                      items={data.topRated.map((c) => ({ label: c.name, value: c.avgRating, hint: `${c.reviewCount} reviews` }))}
                      maxOverride={5}
                    />
                  )}
                </AnalyticsSection>

                <AnalyticsSection kicker="LAGGING" title="Cafes to flag" subtitle="Lowest rated (2+ reviews) — worth telling the owner">
                  {data.lowRated.length === 0 ? (
                    <p className="admin-enquiries-empty">Not enough reviewed cafes yet.</p>
                  ) : (
                    <RankedBars
                      items={data.lowRated.map((c) => ({ label: c.name, value: c.avgRating, hint: `${c.reviewCount} reviews` }))}
                      maxOverride={5}
                      accent="warn"
                    />
                  )}
                </AnalyticsSection>

                <AnalyticsSection kicker="LAGGING" title="Never visited" subtitle="Listed, but no one has logged a visit yet">
                  {data.neverVisited.length === 0 ? (
                    <p className="admin-enquiries-empty">Every cafe has at least one logged visit.</p>
                  ) : (
                    <ul className="plain-chip-list">
                      {data.neverVisited.map((c) => (
                        <li key={c.cafeId}>{c.name}</li>
                      ))}
                    </ul>
                  )}
                </AnalyticsSection>

                <AnalyticsSection kicker="LAGGING" title="Incomplete listings" subtitle="Missing category, tags, or a photo — worse discovery in search/filters">
                  {data.incompleteListings.length === 0 ? (
                    <p className="admin-enquiries-empty">Every cafe has a category, tags, and a photo.</p>
                  ) : (
                    <ul className="incomplete-listings-list">
                      {data.incompleteListings.map((c) => (
                        <li key={c.cafeId}>
                          <span>{c.name}</span>
                          <span className="incomplete-missing">missing {c.missing.join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </AnalyticsSection>
              </>
            )}

            {tab === "categories" && (
              <AnalyticsSection kicker="DEMAND VS SUPPLY" title="By category" subtitle="How many cafes vs. how much activity each category gets">
                <div className="category-table">
                  <div className="category-table-row category-table-head">
                    <span>Category</span>
                    <span>Cafes</span>
                    <span>Visits</span>
                    <span>Reviews</span>
                  </div>
                  {data.categoryBreakdown.map((c) => (
                    <div key={c.category} className="category-table-row">
                      <span>{c.label}</span>
                      <span>{c.cafeCount}</span>
                      <span>{c.visitCount}</span>
                      <span>{c.reviewCount}</span>
                    </div>
                  ))}
                </div>
              </AnalyticsSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: number | string; accent?: "warn" }) {
  return (
    <div className={`kpi-card ${accent === "warn" ? "kpi-card-warn" : ""}`}>
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

function AnalyticsSection({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-enquiries-panel panel-elevated mb-4">
      <header className="admin-enquiries-header">
        <div>
          <span className="ad-rail-kicker">{kicker}</span>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      <div className="analytics-section-body">{children}</div>
    </section>
  );
}

function RankedBars({
  items,
  maxOverride,
  accent,
}: {
  items: { label: string; value: number; hint?: string }[];
  maxOverride?: number;
  accent?: "warn";
}) {
  const max = maxOverride ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="ranked-bars">
      {items.map((item) => (
        <li key={item.label}>
          <div className="ranked-bar-top">
            <span className="ranked-bar-label" title={item.label}>
              {item.label}
            </span>
            <span className="ranked-bar-value">
              {item.value}
              {item.hint && <span className="ranked-bar-hint"> · {item.hint}</span>}
            </span>
          </div>
          <div className="ranked-bar-track">
            <div
              className={`ranked-bar-fill ${accent === "warn" ? "ranked-bar-fill-warn" : ""}`}
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DayBars({ items }: { items: { date: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="day-bars">
      {items.map((item) => (
        <div key={item.date} className="day-bar" title={`${item.date}: ${item.count}`}>
          <div className="day-bar-fill" style={{ height: `${Math.max(4, (item.count / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}
