import MapExperience from "@/components/MapExperience";

// NOT protected by authentication yet — anyone with this URL can pin cafes
// and place free billboards. Fine for local development; must be gated
// behind real admin login (Supabase Auth + a role check) before this is
// deployed anywhere public.
export default function AdminPage() {
  return <MapExperience isAdmin={true} />;
}
