import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createServiceRoleClient } from "@/lib/supabase";

// Uses Supabase Auth's own ban mechanism (`ban_duration` on
// auth.admin.updateUserById) rather than a custom "is_banned" column —
// it's enforced by Supabase itself at sign-in/token-refresh time, so a
// banned account is actually locked out everywhere, not just hidden from
// admin UI while still able to browse. "876000h" (~100 years) reads as
// permanent without relying on a magic sentinel value; "none" reverses it
// exactly the way Supabase's own docs describe unbanning.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (userId === auth.userId) {
    return NextResponse.json({ error: "You can't ban your own admin account." }, { status: 400 });
  }

  const { banned } = await request.json().catch(() => ({ banned: null }));
  if (typeof banned !== "boolean") {
    return NextResponse.json({ error: "Missing banned flag." }, { status: 400 });
  }

  const service = createServiceRoleClient();

  const { data: adminRow } = await service.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (adminRow) {
    return NextResponse.json({ error: "That account is an admin and can't be banned from here." }, { status: 400 });
  }

  const { error } = await service.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, banned });
}
