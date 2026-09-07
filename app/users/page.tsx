import { redirect } from "next/navigation";

// /users only ever existed as a shorthand people typed for the real,
// admin-gated route — redirecting keeps that one page (with its
// AdminGate sign-in/is_admin check) as the single source of truth
// instead of duplicating the whole user-list UI at a second path.
export default function UsersRedirect() {
  redirect("/admin/users");
}
