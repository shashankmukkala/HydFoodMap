import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, isSupabaseConfigured, supabase } from "@/lib/supabase";

const MAX_QUERY_LENGTH = 200;

// Fire-and-forget logging from SearchBox.tsx — public, works for
// signed-out visitors too (most searches happen before anyone signs in),
// so this can't go through RLS the way a normal user write would. The
// service role writes on the caller's behalf instead; there's no read
// access for a client at all, only through app/api/admin/analytics.
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true });

  const { query, resultCount } = await request.json().catch(() => ({ query: null, resultCount: null }));
  if (typeof query !== "string" || !query.trim() || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ ok: true });
  }
  const safeResultCount = Number.isInteger(resultCount) && resultCount >= 0 ? resultCount : 0;

  // Best-effort identity — a search log is still useful without one, so a
  // missing/expired token just logs anonymously rather than failing.
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  let userId: string | null = null;
  if (token) {
    const { data } = await supabase.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  const service = createServiceRoleClient();
  await service.from("search_logs").insert({ query: query.trim(), result_count: safeResultCount, user_id: userId });

  return NextResponse.json({ ok: true });
}
