import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createServiceRoleClient } from "@/lib/supabase";
import type { PointsConfigEntry } from "@/app/api/points-config/route";

const ACTIONS = ["review", "visit", "photo", "repeat_visit"] as const;

// Admin view/edit of points_config (0029) — the amounts award_review_points()
// and award_visit_points() (Postgres triggers on reviews/visited_cafes)
// actually read at award time. This route only changes the numbers those
// triggers use next; it never touches points already awarded.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const service = createServiceRoleClient();
  const { data, error } = await service.from("points_config").select("action, amount, min_amount");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries: PointsConfigEntry[] = (data ?? []).map((row) => ({
    action: row.action,
    amount: row.amount,
    minAmount: row.min_amount,
  }));
  return NextResponse.json(entries);
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { data: existing, error: existingError } = await service.from("points_config").select("action, min_amount");
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const minByAction = new Map((existing ?? []).map((row) => [row.action, row.min_amount]));

  for (const action of ACTIONS) {
    const amount = (body as Record<string, unknown>)[action];
    if (amount === undefined) continue;
    const min = minByAction.get(action) ?? 1;
    if (!Number.isInteger(amount) || (amount as number) < min || (amount as number) > 1000) {
      return NextResponse.json({ error: `${action}: enter a whole number between ${min} and 1000.` }, { status: 400 });
    }
  }

  const updates = ACTIONS.filter((action) => (body as Record<string, unknown>)[action] !== undefined).map(
    (action) =>
      service
        .from("points_config")
        .update({ amount: (body as Record<string, unknown>)[action], updated_at: new Date().toISOString() })
        .eq("action", action)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });

  const { data, error } = await service.from("points_config").select("action, amount, min_amount");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const entries: PointsConfigEntry[] = (data ?? []).map((row) => ({
    action: row.action,
    amount: row.amount,
    minAmount: row.min_amount,
  }));
  return NextResponse.json(entries);
}
