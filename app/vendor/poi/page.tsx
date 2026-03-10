import type { Metadata } from "next";
import PoiListPage from "@/modules/poi/components/PoiListPage";

export const metadata: Metadata = {
  title: "POI Management – FlavorTales",
};

export default function VendorPoiPage() {
  return <PoiListPage />;
}
