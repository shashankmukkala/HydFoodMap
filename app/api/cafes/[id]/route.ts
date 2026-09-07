import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { localDelete, localUpdate } from "@/lib/localCafeStore";
import { requireAdmin } from "@/lib/adminAuth";

const MAX_IMAGE_DATA_LENGTH = 1_500_000;

// Admin-only: editing (category/tags/photo/etc.) and removing a pin. The
// `cafes` table's RLS (0001_init.sql) is actually wide open for update/
// delete — an MVP-era policy that predates auth entirely — so this
// route, not RLS, is what actually restricts these to admins. Was
// previously unauthenticated and unused by any client code; gated here
// rather than left open now that app/admin/... calls it for edits.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  // Same cap/format check as a review photo (app/api/cafes/[id]/reviews)
  // — image_url can also be a plain http(s) URL (PlaceCafeForm's "Photo
  // URL" field), so only data: URIs are size-checked here.
  if (typeof body.image_url === "string" && body.image_url.startsWith("data:image/") && body.image_url.length > MAX_IMAGE_DATA_LENGTH) {
    return NextResponse.json({ error: "Photo must be a supported image under 1 MB." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const cafe = localUpdate(id, body);
    if (!cafe) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(cafe);
  }

  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.client
    .from("cafes")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    const ok = localDelete(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await auth.client.from("cafes").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
