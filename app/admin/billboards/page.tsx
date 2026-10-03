"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminGate from "@/components/AdminGate";
import FeedPanel from "@/components/FeedPanel";
import { useAdminAuth } from "@/lib/useAdminAuth";
import type { Billboard } from "@/lib/supabase";

export default function AdminBillboardsPage() {
  return (
    <AdminGate>
      <BillboardsAdmin />
    </AdminGate>
  );
}

function BillboardsAdmin() {
  const router = useRouter();
  const { session } = useAdminAuth();
  const accessToken = session?.access_token ?? null;
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billboards")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setBillboards(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function deleteBillboard(id: string) {
    if (!accessToken) return;
    setBillboards((prev) => prev.filter((b) => b.id !== id));
    try {
      await fetch(`/api/billboards/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    } catch {
      // Best-effort — the placement stays removed from view even if the request fails.
    }
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-5 py-4 backdrop-blur">
        <div>
          <Link href="/admin" className="text-xs text-ink-muted hover:underline">
            ← Back to map
          </Link>
          <h1 className="mt-1 text-[28px] leading-tight">Billboards</h1>
          <p className="text-xs text-ink-muted">
            {billboards.length} pinned placement{billboards.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5">
        {loading ? (
          <div className="admin-enquiries-empty">Loading…</div>
        ) : (
          <FeedPanel
            kind="billboard"
            title="Billboards"
            icon="📢"
            emptyLabel="No billboards yet — place one from the map's Ad placements."
            items={billboards}
            onSelect={() => {}}
            onDelete={deleteBillboard}
            onClose={() => router.push("/admin")}
          />
        )}
      </div>
    </div>
  );
}
