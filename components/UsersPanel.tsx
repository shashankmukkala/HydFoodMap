"use client";

import type { AdminUserSummary } from "@/app/api/admin/users/route";

type Props = { users: AdminUserSummary[]; loading: boolean; error: string | null; onClose: () => void };

export default function UsersPanel({ users, loading, error, onClose }: Props) {
  return (
    <section className="admin-enquiries-panel panel-elevated">
      <header className="admin-enquiries-header">
        <div>
          <span className="ad-rail-kicker">ANALYTICS</span>
          <h2>Users</h2>
          <p>{users.length} signed-in account{users.length === 1 ? "" : "s"}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close users">
          ×
        </button>
      </header>
      <div className="admin-enquiries-list">
        {loading && <div className="admin-enquiries-empty">Loading…</div>}
        {error && !loading && <div className="admin-enquiries-empty">{error}</div>}
        {!loading && !error && users.length === 0 && (
          <div className="admin-enquiries-empty">No one has signed in yet.</div>
        )}
        {!loading &&
          !error &&
          users.map((user) => (
            <article key={user.userId} className="admin-enquiry-item admin-user-item">
              <div className="admin-user-item-top">
                <div className="admin-user-identity">
                  <span className="admin-user-avatar">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt="" />
                    ) : (
                      (user.displayName ?? user.email ?? "?").slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <div>
                    <h3>{user.displayName ?? "Unnamed"}</h3>
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
                <div className="admin-user-section-label">
                  Visited ({user.visitedCafeNames.length})
                </div>
                <p className="admin-enquiry-message">
                  {user.visitedCafeNames.length > 0 ? user.visitedCafeNames.join(", ") : "None yet."}
                </p>
              </div>

              <div className="admin-user-section">
                <div className="admin-user-section-label">
                  Reviews ({user.reviews.length})
                </div>
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
            </article>
          ))}
      </div>
    </section>
  );
}
