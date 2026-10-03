import type { Metadata } from "next";
import { redirect } from "next/navigation";
import HomeCover from "@/components/HomeCover";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { localGetAll } from "@/lib/localCafeStore";

export const metadata: Metadata = {
  title: { absolute: "HydCafeMap" },
  description: "Every cafe worth the trip in Hyderabad, on one map.",
};

/**
 * How many cafes are pinned. Read live, never written into the copy.
 *
 * Returns null rather than a seed-file count when the real number can't be
 * read — /api/cafes stopped substituting the local store for a failed
 * query, and a headline number is exactly the wrong place to print a
 * figure that might be from a stale snapshot. HomeCover renders its copy
 * without the count when this is null.
 */
async function getTotal(): Promise<number | null> {
  if (!isSupabaseConfigured()) return localGetAll().length;
  const { count, error } = await supabase.from("cafes").select("id", { count: "exact", head: true });
  if (error) {
    console.error("[/] cafe count failed:", error.message);
    return null;
  }
  return count ?? 0;
}

/**
 * One screen, and only one screen: the painting, and ways in.
 *
 * The map used to live here. It moved to /map so this route can say what
 * the product is before asking anyone to operate it. Links shared before
 * the move carry the map's own query string (`?lat=&lng=` from the card's
 * share button), so anything arriving with a query is forwarded rather
 * than shown a cover it did not ask for.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  if (query.size > 0) redirect(`/map?${query}`);

  const total = await getTotal();

  return (
    <main className="h-[100svh] overflow-hidden">
      <HomeCover total={total} />
    </main>
  );
}
