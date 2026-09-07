import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { localGetAllEvents, localInsertEvent } from "@/lib/localEventStore";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(localGetAllEvents());
  }

  const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, event_date, location, description } = body;

  if (!name || !event_date) {
    return NextResponse.json({ error: "name and event_date are required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    const event = localInsertEvent({
      name,
      event_date,
      location: location || null,
      description: description || null,
    });
    return NextResponse.json(event, { status: 201 });
  }

  // Events feed the public news ticker, so an open create route meant
  // anyone could broadcast arbitrary text on the map.
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.client
    .from("events")
    .insert({ name, event_date, location: location || null, description: description || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
