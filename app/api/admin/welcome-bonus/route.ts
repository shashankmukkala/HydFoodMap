import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createServiceRoleClient } from "@/lib/supabase";

export type WelcomeBonusConfig = {
  enabled: boolean;
  amount: number;
  message: string | null;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
};

function toClient(row: {
  enabled: boolean;
  amount: number;
  message: string | null;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
}): WelcomeBonusConfig {
  return {
    enabled: row.enabled,
    amount: row.amount,
    message: row.message,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    updatedAt: row.updated_at,
  };
}

// Singleton row (welcome_bonus_config.id = 1, 0028) read by
// handle_new_user() at signup time — this route is only how an admin
// views/edits it, not the thing that actually credits anyone. Service
// role since there's deliberately no RLS policy on this table (same as
// admin_recovery) for a regular client to read/write.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const service = createServiceRoleClient();
  const { data, error } = await service.from("welcome_bonus_config").select("*").eq("id", 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(toClient(data));
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean" || !Number.isInteger(body.amount) || body.amount < 0 || body.amount > 1000) {
    return NextResponse.json({ error: "Enter a whole number of points between 0 and 1000." }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 300) || null : null;
  const startsAt = typeof body.startsAt === "string" && body.startsAt ? body.startsAt : null;
  const endsAt = typeof body.endsAt === "string" && body.endsAt ? body.endsAt : null;
  if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
    return NextResponse.json({ error: "The start date must be before the end date." }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("welcome_bonus_config")
    .update({
      enabled: body.enabled,
      amount: body.amount,
      message,
      starts_at: startsAt,
      ends_at: endsAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(toClient(data));
}
