import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await request.json();
  if (!isSupabaseConfigured() || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status or database configuration." }, { status: 400 });
  }
  const { data, error } = await supabase.from("ad_enquiries").update({ status }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
