import type { Metadata } from "next";
import ShopListPage from "@/modules/shop/components/ShopListPage";

export const metadata: Metadata = {
  title: "Quản lý gian hàng – FlavorTales",
};

export default function VendorShopPage() {
  return <ShopListPage />;
}
