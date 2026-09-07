"use client";

import { useEffect, useState } from "react";
import type { PointsConfigEntry } from "@/app/api/points-config/route";

const ACTION_LABELS: Record<PointsConfigEntry["action"], string> = {
  review: "Posting a review",
  visit: "Visiting a cafe (first time, verified)",
  photo: "Adding a photo to a review",
  repeat_visit: "Returning to a cafe (verified, 20h+ apart)",
};

// Edits points_config (0029) — the amounts award_review_points()/
// award_visit_points() (Postgres triggers on reviews/visited_cafes) read
// at the moment each is earned. A saved change here only affects future
// awards, never rewrites what anyone already earned.
export default function PointsConfigSettings({ accessToken }: { accessToken: string | null }) {
  const [entries, setEntries] = useState<PointsConfigEntry[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    fetch("/api/admin/points-config", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Couldn't load points settings.");
        setEntries(data);
        setValues(Object.fromEntries((data as PointsConfigEntry[]).map((e) => [e.action, String(e.amount)])));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load points settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  async function save() {
    if (!accessToken || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const body: Record<string, number> = {};
      for (const entry of entries) body[entry.action] = Number(values[entry.action]);
      const res = await fetch("/api/admin/points-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save points settings.");
      setEntries(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save points settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <section className="admin-enquiries-panel panel-elevated mb-4">
      <header className="admin-enquiries-header">
        <div>
          <span className="ad-rail-kicker">REWARDS</span>
          <h2>Points per action</h2>
          <p>What visitors earn for reviews, visits, and photos</p>
        </div>
      </header>
      <div className="welcome-bonus-form">
        {entries.map((entry) => (
          <label key={entry.action} className="points-config-row">
            <span>{ACTION_LABELS[entry.action]}</span>
            <input
              value={values[entry.action] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [entry.action]: e.target.value.replace(/\D/g, "").slice(0, 4) }))
              }
              inputMode="numeric"
              aria-label={`Points for ${ACTION_LABELS[entry.action]}`}
            />
          </label>
        ))}
        <p className="welcome-bonus-hint">Each has a minimum floor set by the app — you can raise these, not zero them out.</p>

        {error && <p className="admin-user-action-error">{error}</p>}

        <button type="button" onClick={save} disabled={saving} className="welcome-bonus-save">
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
        </button>
      </div>
    </section>
  );
}
