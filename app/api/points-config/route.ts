import { NextResponse } from "next/server";
import { createServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase";

export type PointsConfigEntry = { action: "review" | "visit" | "photo" | "repeat_visit"; amount: number; minAmount: number };

// Public — how many points each action earns isn't sensitive, and
// components like PointsWidget need it to show accurate "earn X points"
// copy instead of a stale hardcoded number now that admins can change
// these (app/api/admin/points-config). No requireAdmin here on purpose.
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json([]);

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
