import type { Metadata } from "next";
import AdminPoiList from "@/modules/admin/components/poi/AdminPoiList";

export const metadata: Metadata = {
  title: "Pending Reviews – FlavorTales Admin",
};

export default function PendingReviewsPage() {
  return <AdminPoiList />;
}
