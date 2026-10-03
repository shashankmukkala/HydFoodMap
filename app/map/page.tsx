import type { Metadata } from "next";
import MapExperience from "@/components/MapExperience";

export const metadata: Metadata = {
  title: "Map",
  description: "Every cafe worth the trip in Hyderabad, on one map.",
};

export default function MapPage() {
  return <MapExperience isAdmin={false} />;
}
