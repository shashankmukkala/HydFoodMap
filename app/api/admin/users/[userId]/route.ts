import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createServiceRoleClient } from "@/lib/supabase";

// Deletes a visitor account entirely — auth.users row plus every table
// that references it (bookmarks, collections, points_ledger, reviews,
// visited_cafes, profiles), all via `on delete cascade` FKs set up back
// in 0008/0009/0014/0024/0025. There's no soft-delete/undo: this is a
// destructive admin action, same trust level as the rest of
// app/api/admin/*.
//
// Uses the service role client (not the caller's own token) because
// deleting another user's auth.users row is an auth-admin operation, not
// something any RLS policy could grant — requireAdmin's `is_admin()`
// check is what gates this, not RLS.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (userId === auth.userId) {
    return NextResponse.json({ error: "You can't delete your own admin account from here." }, { status: 400 });
  }

  const service = createServiceRoleClient();

  // Refuse to delete another admin through the visitor-management UI —
  // this route is for visitor accounts (see app/api/admin/users, which
  // already excludes admins from the list it shows).
  const { data: adminRow } = await service.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (adminRow) {
    return NextResponse.json({ error: "That account is an admin — remove admin access separately first." }, { status: 400 });
  }

  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
