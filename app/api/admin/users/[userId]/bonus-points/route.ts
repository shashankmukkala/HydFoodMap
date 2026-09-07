import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createServiceRoleClient } from "@/lib/supabase";

// Awards a one-off bonus into points_ledger (reason 'bonus', added
// alongside the existing 'review' reason in 0026) — same ledger
// lib/usePoints.ts reads from, so it shows up in the user's balance
// immediately, just like a review reward would. A reason message is
// required and written into `notifications` (0027) in the same request,
// so the recipient sees *why* their balance changed rather than just a
// silently larger number — a bonus with no explanation is indistinguishable
// from a bug to the person receiving it.
//
// Service role, not the caller's token: there's deliberately no RLS
// insert policy letting anyone write into another user's points_ledger
// or notifications rows (see the comment in app/api/admin/users/route.ts
// on why cross-user access goes through one reviewed endpoint instead of
// a standing RLS exception). requireAdmin is what gates this.
export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { amount, message } = await request.json().catch(() => ({ amount: null, message: null }));
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1000) {
    return NextResponse.json({ error: "Enter a whole number of points between 1 and 1000." }, { status: 400 });
  }
  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  if (!trimmedMessage || trimmedMessage.length > 300) {
    return NextResponse.json({ error: "Enter a reason (up to 300 characters) so the user knows why." }, { status: 400 });
  }

  const service = createServiceRoleClient();

  const { data: user, error: userError } = await service.auth.admin.getUserById(userId);
  if (userError || !user?.user) {
    return NextResponse.json({ error: "That account no longer exists." }, { status: 404 });
  }

  const { error } = await service.from("points_ledger").insert({ user_id: userId, amount, reason: "bonus" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: notifyError } = await service.from("notifications").insert({
    user_id: userId,
    message: `You received a ${amount}-point bonus: ${trimmedMessage}`,
    type: "bonus",
    amount,
  });
  // Points are already awarded at this point — a notification failure
  // shouldn't roll that back or report the whole action as failed, just
  // surface it so the admin knows the user won't see an explanation.
  if (notifyError) {
    return NextResponse.json({ ok: true, notified: false, warning: "Points awarded, but the notification failed to send." });
  }

  return NextResponse.json({ ok: true, notified: true });
}
