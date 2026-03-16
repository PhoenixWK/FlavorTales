import type { Metadata } from "next";
import CreateShopForm from "@/modules/shop/components/create/CreateShopForm";

export const metadata: Metadata = {
  title: "Tạo gian hàng – FlavorTales",
};

export default function CreateShopPage() {
  return (
    <main className="min-h-screen w-fit mx-auto bg-[#ffe9d0] rounded-lg py-10 px-4">
      <CreateShopForm />
    </main>
  );
}
