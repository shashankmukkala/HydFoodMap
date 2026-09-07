"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGate from "@/components/AdminGate";
import WelcomeBonusSettings from "@/components/WelcomeBonusSettings";
import PointsConfigSettings from "@/components/PointsConfigSettings";
import Avatar from "@/components/Avatar";
import { useAdminAuth } from "@/lib/useAdminAuth";
import type { AdminUserSummary } from "@/app/api/admin/users/route";

export default function AdminUsersPage() {
  return (
    <AdminGate>
      <UsersAnalytics />
    </AdminGate>
  );
}

type Metric = "none" | "points" | "visited" | "reviews";
type Status = "all" | "active" | "banned";
type SortBy = "newest" | "oldest" | "points" | "visited" | "reviews";
type Filters = { metric: Metric; minValue: string; status: Status; joinedAfter: string; joinedBefore: string; sortBy: SortBy };
const EMPTY_FILTERS: Filters = {
  metric: "none",
  minValue: "",
  status: "all",
  joinedAfter: "",
  joinedBefore: "",
  sortBy: "newest",
};
const METRIC_LABELS: Record<Exclude<Metric, "none">, string> = {
  points: "Points",
  visited: "Cafes visited",
  reviews: "Reviews added",
};
// A quick way to set a common amount without typing it every time — the
// exact "easy option to reward" a bulk/single points form is missing
// without this: every award otherwise starts from a blank text field.
const PRESET_AMOUNTS = [10, 25, 50, 100];

function metricValue(user: AdminUserSummary, metric: Metric): number {
  if (metric === "points") return user.points;
  if (metric === "visited") return user.visitedCafeNames.length;
  if (metric === "reviews") return user.reviews.length;
  return 0;
}

function PresetAmountButtons({ onPick }: { onPick: (amount: number) => void }) {
  return (
    <div className="preset-amount-row">
      {PRESET_AMOUNTS.map((amount) => (
        <button key={amount} type="button" onClick={() => onPick(amount)} className="preset-amount-btn">
          +{amount}
        </button>
      ))}
    </div>
  );
}

function UsersAnalytics() {
  const { session } = useAdminAuth();
  const accessToken = session?.access_token ?? null;
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    fetch("/api/admin/users", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Couldn't load users.");
        setUsers(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load users.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (filters.metric !== "none") {
      const min = Number(filters.minValue) || 0;
      result = result.filter((u) => metricValue(u, filters.metric) >= min);
    }
    if (filters.status !== "all") {
      result = result.filter((u) => (filters.status === "banned" ? u.banned : !u.banned));
    }
    if (filters.joinedAfter) {
      const after = new Date(filters.joinedAfter).getTime();
      result = result.filter((u) => new Date(u.joinedAt).getTime() >= after);
    }
    if (filters.joinedBefore) {
      // End-of-day so picking the same date for both ends includes that day.
      const before = new Date(filters.joinedBefore).getTime() + 24 * 60 * 60 * 1000;
      result = result.filter((u) => new Date(u.joinedAt).getTime() < before);
    }
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (u) => (u.displayName ?? "").toLowerCase().includes(query) || (u.email ?? "").toLowerCase().includes(query)
      );
    }
    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (filters.sortBy) {
        case "oldest":
          return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
        case "points":
          return b.points - a.points;
        case "visited":
          return b.visitedCafeNames.length - a.visitedCafeNames.length;
        case "reviews":
          return b.reviews.length - a.reviews.length;
        default:
          return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
      }
    });
    return sorted;
  }, [users, filters, search]);

  const filteredIds = useMemo(() => new Set(filteredUsers.map((u) => u.userId)), [filteredUsers]);
  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selected.has(u.userId));

  function handleDeleted(userId: string) {
    setUsers((prev) => prev.filter((u) => u.userId !== userId));
    setSelected((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }

  function handleBonusAwarded(userId: string, amount: number) {
    setUsers((prev) => prev.map((u) => (u.userId === userId ? { ...u, points: u.points + amount } : u)));
  }

  function handleBanToggled(userId: string, banned: boolean) {
    setUsers((prev) => prev.map((u) => (u.userId === userId ? { ...u, banned } : u)));
  }

  function toggleSelect(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      }
      return new Set([...prev, ...filteredIds]);
    });
  }

  function handleBulkAwarded(userIds: string[], amount: number) {
    setUsers((prev) => prev.map((u) => (userIds.includes(u.userId) ? { ...u, points: u.points + amount } : u)));
    setSelected(new Set());
  }

  return (
    <div className="min-h-dvh bg-[#0b0b0d] text-neutral-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b0b0d]/95 px-5 py-4 backdrop-blur">
        <div>
          <Link href="/admin" className="text-xs text-neutral-400 hover:underline">
            ← Back to map
          </Link>
          <h1 className="mt-1 text-lg font-semibold">Users</h1>
          <p className="text-xs text-neutral-400">
            {users.length} signed-in account{users.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className="admin-users-layout mx-auto max-w-5xl px-4 py-5">
        <aside className="admin-users-side">
          <PointsConfigSettings accessToken={accessToken} />
          <WelcomeBonusSettings accessToken={accessToken} />
        </aside>

        <div className="admin-users-main">
          {!loading && !error && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="admin-user-search"
              aria-label="Search users by name or email"
            />
          )}

          {!loading && !error && (
            <div className="admin-user-filters">
              <label>
                Filter by
                <select
                  value={filters.metric}
                  onChange={(e) => setFilters((f) => ({ ...f, metric: e.target.value as Metric, minValue: "" }))}
                >
                  <option value="none">No filter</option>
                  <option value="points">Points</option>
                  <option value="visited">Cafes visited</option>
                  <option value="reviews">Reviews added</option>
                </select>
              </label>
              {filters.metric !== "none" && (
                <label>
                  At least
                  <input
                    value={filters.minValue}
                    onChange={(e) => setFilters((f) => ({ ...f, minValue: e.target.value.replace(/\D/g, "") }))}
                    inputMode="numeric"
                    placeholder="0"
                    aria-label={`Minimum ${METRIC_LABELS[filters.metric]}`}
                  />
                </label>
              )}
              <label>
                Status
                <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Status }))}>
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
              </label>
              <label>
                Joined after
                <input
                  type="date"
                  value={filters.joinedAfter}
                  onChange={(e) => setFilters((f) => ({ ...f, joinedAfter: e.target.value }))}
                />
              </label>
              <label>
                Joined before
                <input
                  type="date"
                  value={filters.joinedBefore}
                  onChange={(e) => setFilters((f) => ({ ...f, joinedBefore: e.target.value }))}
                />
              </label>
              <label>
                Sort by
                <select value={filters.sortBy} onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as SortBy }))}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="points">Most points</option>
                  <option value="visited">Most visited</option>
                  <option value="reviews">Most reviews</option>
                </select>
              </label>
              {JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS) && (
                <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="admin-user-filters-clear">
                  Clear
                </button>
              )}
            </div>
          )}

          {!loading && !error && filteredUsers.length > 0 && (
            <label className="admin-user-select-all">
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
              Select all {filteredUsers.length} matching
            </label>
          )}

          {selected.size > 0 && (
            <BulkBonusBar
              count={selected.size}
              userIds={[...selected]}
              accessToken={accessToken}
              onAwarded={handleBulkAwarded}
              onCancel={() => setSelected(new Set())}
            />
          )}

          <div className="admin-users-list">
            {loading && <div className="admin-enquiries-empty">Loading…</div>}
            {error && !loading && <div className="admin-enquiries-empty">{error}</div>}
            {!loading && !error && users.length === 0 && (
              <div className="admin-enquiries-empty">No one has signed in yet.</div>
            )}
            {!loading && !error && users.length > 0 && filteredUsers.length === 0 && (
              <div className="admin-enquiries-empty">No users match that search or filter.</div>
            )}
            {!loading &&
              !error &&
              filteredUsers.map((user) => (
                <UserCard
                  key={user.userId}
                  user={user}
                  accessToken={accessToken}
                  selected={selected.has(user.userId)}
                  onToggleSelect={() => toggleSelect(user.userId)}
                  onDeleted={handleDeleted}
                  onBonusAwarded={handleBonusAwarded}
                  onBanToggled={handleBanToggled}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkBonusBar({
  count,
  userIds,
  accessToken,
  onAwarded,
  onCancel,
}: {
  count: number;
  userIds: string[];
  accessToken: string | null;
  onAwarded: (userIds: string[], amount: number) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = Number.isInteger(Number(amount)) && Number(amount) > 0 && message.trim().length > 0;

  async function submit() {
    if (!accessToken || !valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/bulk-bonus-points", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ userIds, amount: Number(amount), message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't award points.");
      onAwarded(userIds, Number(amount));
      setAmount("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't award points.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bulk-bonus-bar panel-elevated">
      <div className="bulk-bonus-bar-inner">
        <span className="bulk-bonus-count">{count} selected</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Points"
          inputMode="numeric"
        />
        <PresetAmountButtons onPick={(a) => setAmount(String(a))} />
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 300))}
          placeholder="Reason everyone selected will see"
          className="bulk-bonus-message"
        />
        <button type="button" onClick={submit} disabled={!valid || busy}>
          {busy ? "Awarding…" : `Give bonus to ${count}`}
        </button>
        <button type="button" onClick={onCancel} className="bulk-bonus-cancel" disabled={busy}>
          Cancel
        </button>
      </div>
      {error && <p className="admin-user-action-error">{error}</p>}
    </div>
  );
}

function UserCard({
  user,
  accessToken,
  selected,
  onToggleSelect,
  onDeleted,
  onBonusAwarded,
  onBanToggled,
}: {
  user: AdminUserSummary;
  accessToken: string | null;
  selected: boolean;
  onToggleSelect: () => void;
  onDeleted: (userId: string) => void;
  onBonusAwarded: (userId: string, amount: number) => void;
  onBanToggled: (userId: string, banned: boolean) => void;
}) {
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusMessage, setBonusMessage] = useState("");
  const [busy, setBusy] = useState<"bonus" | "delete" | "ban" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const bonusFormValid = Number.isInteger(Number(bonusAmount)) && Number(bonusAmount) > 0 && bonusMessage.trim().length > 0;

  async function awardBonus() {
    const amount = Number(bonusAmount);
    if (!accessToken || !bonusFormValid || busy) return;
    setBusy("bonus");
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.userId}/bonus-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ amount, message: bonusMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't award points.");
      onBonusAwarded(user.userId, amount);
      setBonusAmount("");
      setBonusMessage("");
      if (data.warning) setActionError(data.warning);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't award points.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleBan() {
    if (!accessToken || busy) return;
    const nextBanned = !user.banned;
    if (nextBanned && !window.confirm(`Ban ${user.displayName ?? user.email ?? "this user"}? They won't be able to sign in until unbanned.`)) {
      return;
    }
    setBusy("ban");
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.userId}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ banned: nextBanned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't update ban status.");
      onBanToggled(user.userId, nextBanned);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update ban status.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteUser() {
    if (!accessToken || busy) return;
    if (!window.confirm(`Delete ${user.displayName ?? user.email ?? "this user"}? This can't be undone.`)) return;
    setBusy("delete");
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't delete this user.");
      onDeleted(user.userId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't delete this user.");
      setBusy(null);
    }
  }

  return (
    <article className={`admin-enquiry-item admin-user-item ${selected ? "admin-user-item-selected" : ""}`}>
      <div className="admin-user-item-top">
        <div className="admin-user-identity">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${user.displayName ?? user.email ?? "user"}`}
            className="admin-user-checkbox"
          />
          <Avatar avatarUrl={user.avatarUrl} label={user.displayName ?? user.email ?? "?"} className="admin-user-avatar" />
          <div>
            <h3>
              {user.displayName ?? "Unnamed"}
              {user.banned && <span className="admin-user-banned-badge">Banned</span>}
            </h3>
            <div className="admin-enquiry-meta">{user.email ?? "no email on file"}</div>
          </div>
        </div>
        <span className="admin-user-points">★ {user.points}</span>
      </div>

      <div className="admin-enquiry-meta">
        Joined {new Date(user.joinedAt).toLocaleDateString()} · {user.bookmarksCount} saved ·{" "}
        {user.collectionsCount} collection{user.collectionsCount === 1 ? "" : "s"}
      </div>

      <div className="admin-user-section">
        <div className="admin-user-section-label">Visited ({user.visitedCafeNames.length})</div>
        <p className="admin-enquiry-message">
          {user.visitedCafeNames.length > 0 ? user.visitedCafeNames.join(", ") : "None yet."}
        </p>
      </div>

      <div className="admin-user-section">
        <div className="admin-user-section-label">Reviews ({user.reviews.length})</div>
        {user.reviews.length === 0 ? (
          <p className="admin-enquiry-message">None yet.</p>
        ) : (
          <ul className="admin-user-reviews">
            {user.reviews.map((review, i) => (
              <li key={i}>
                <strong>{"★".repeat(review.rating)}</strong> {review.cafeName}
                {review.favoriteFood && <> · liked: {review.favoriteFood}</>}
                {review.comment && <p>{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-user-actions">
        <div className="admin-user-bonus-form">
          <input
            value={bonusAmount}
            onChange={(e) => setBonusAmount(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Points"
            inputMode="numeric"
            aria-label={`Bonus points for ${user.displayName ?? user.email ?? "user"}`}
          />
          <PresetAmountButtons onPick={(a) => setBonusAmount(String(a))} />
          <input
            value={bonusMessage}
            onChange={(e) => setBonusMessage(e.target.value.slice(0, 300))}
            placeholder="Reason the user will see (required)"
            className="admin-user-bonus-reason"
            aria-label={`Bonus reason for ${user.displayName ?? user.email ?? "user"}`}
          />
          <button type="button" onClick={awardBonus} disabled={!bonusFormValid || busy !== null}>
            {busy === "bonus" ? "Awarding…" : "Give bonus"}
          </button>
        </div>
        <div className="admin-user-danger-actions">
          <button type="button" className="admin-user-ban" onClick={toggleBan} disabled={busy !== null}>
            {busy === "ban" ? "Updating…" : user.banned ? "Unban user" : "Ban user"}
          </button>
          <button type="button" className="admin-user-delete" onClick={deleteUser} disabled={busy !== null}>
            {busy === "delete" ? "Deleting…" : "Delete user"}
          </button>
        </div>
      </div>
      {actionError && <p className="admin-user-action-error">{actionError}</p>}
    </article>
  );
}
