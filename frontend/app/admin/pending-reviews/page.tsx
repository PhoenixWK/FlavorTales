import type { Metadata } from "next";
import PendingReviewsList from "@/modules/admin/components/PendingReviewsList";

export const metadata: Metadata = {
  title: "Pending Reviews – FlavorTales Admin",
};

export default function PendingReviewsPage() {
  return <PendingReviewsList />;
}
