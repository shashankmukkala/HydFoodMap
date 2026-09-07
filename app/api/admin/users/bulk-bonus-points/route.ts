import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createServiceRoleClient } from "@/lib/supabase";

const MAX_RECIPIENTS = 500;

// Same as app/api/admin/users/[userId]/bonus-points, but for many users at
// once — the whole point of the filter+multi-select UI on /admin/users is
// awarding the same amount and reason to a batch instead of repeating the
// single-user form. One points_ledger row and one notifications row per
// recipient, both inserted as a single batched call rather than one
// round trip per user.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { userIds, amount, message } = await request.json().catch(() => ({ userIds: null, amount: null, message: null }));

  if (!Array.isArray(userIds) || userIds.length === 0 || !userIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Select at least one user." }, { status: 400 });
  }
  if (userIds.length > MAX_RECIPIENTS) {
    return NextResponse.json({ error: `Select ${MAX_RECIPIENTS} users or fewer at a time.` }, { status: 400 });
  }
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1000) {
    return NextResponse.json({ error: "Enter a whole number of points between 1 and 1000." }, { status: 400 });
  }
  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  if (!trimmedMessage || trimmedMessage.length > 300) {
    return NextResponse.json({ error: "Enter a reason (up to 300 characters) so users know why." }, { status: 400 });
  }

  const uniqueUserIds = [...new Set(userIds)];
  const service = createServiceRoleClient();

  const { error: pointsError } = await service
    .from("points_ledger")
    .insert(uniqueUserIds.map((userId) => ({ user_id: userId, amount, reason: "bonus" })));
  if (pointsError) return NextResponse.json({ error: pointsError.message }, { status: 500 });

  const { error: notifyError } = await service.from("notifications").insert(
    uniqueUserIds.map((userId) => ({
      user_id: userId,
      message: `You received a ${amount}-point bonus: ${trimmedMessage}`,
      type: "bonus",
      amount,
    }))
  );
  if (notifyError) {
    return NextResponse.json({
      ok: true,
      recipientCount: uniqueUserIds.length,
      notified: false,
      warning: "Points awarded, but some notifications failed to send.",
    });
  }

  return NextResponse.json({ ok: true, recipientCount: uniqueUserIds.length, notified: true });
}
