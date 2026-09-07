"use client";

import { useEffect, useState } from "react";
import type { WelcomeBonusConfig } from "@/app/api/admin/welcome-bonus/route";

// Toggling `enabled` off (or narrowing the date window) only stops *future*
// signups from being credited — handle_new_user() (0028) reads this table
// live at the moment each new account is created, so nothing here ever
// touches points already awarded to existing users. That's the point: an
// admin can run a signup promotion for a few days, then dial the amount
// down or switch it off entirely, without needing to reconcile anyone who
// already got the higher amount.
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export default function WelcomeBonusSettings({ accessToken }: { accessToken: string | null }) {
  const [config, setConfig] = useState<WelcomeBonusConfig | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    fetch("/api/admin/welcome-bonus", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Couldn't load welcome bonus settings.");
        setConfig(data);
        setEnabled(data.enabled);
        setAmount(String(data.amount));
        setMessage(data.message ?? "");
        setStartsAt(toDatetimeLocal(data.startsAt));
        setEndsAt(toDatetimeLocal(data.endsAt));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load welcome bonus settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const amountValid = Number.isInteger(Number(amount)) && Number(amount) >= 0;

  async function save() {
    if (!accessToken || !amountValid || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/welcome-bonus", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          enabled,
          amount: Number(amount),
          message: message.trim() || null,
          startsAt: fromDatetimeLocal(startsAt),
          endsAt: fromDatetimeLocal(endsAt),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save settings.");
      setConfig(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <section className="admin-enquiries-panel panel-elevated mb-4">
      <header className="admin-enquiries-header">
        <div>
          <span className="ad-rail-kicker">SIGNUPS</span>
          <h2>Welcome bonus</h2>
          <p>
            {config?.enabled ? `Live — ${config.amount} points on signup` : "Off — new signups get nothing automatically"}
          </p>
        </div>
      </header>
      <div className="welcome-bonus-form">
        <label className="welcome-bonus-toggle">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Award points automatically when someone signs up
        </label>

        <div className="welcome-bonus-row">
          <label>
            Points
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="e.g. 50"
            />
          </label>
        </div>

        <label className="welcome-bonus-field">
          Message the user sees (optional)
          <input value={message} onChange={(e) => setMessage(e.target.value.slice(0, 300))} placeholder="Welcome to HydCafeMap!" />
        </label>

        <div className="welcome-bonus-row">
          <label>
            Only for signups after
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>
          <label>
            Until
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
        </div>
        <p className="welcome-bonus-hint">Leave either date blank for no limit on that end.</p>

        {error && <p className="admin-user-action-error">{error}</p>}

        <button type="button" onClick={save} disabled={!amountValid || saving} className="welcome-bonus-save">
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
        </button>
      </div>
    </section>
  );
}
