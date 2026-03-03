import { Suspense } from "react";
import VendorLoginForm from "@/modules/auth/components/VendorLoginForm";

export const metadata = {
  title: "Sign In | FlavorTales",
  description: "Sign in to your FlavorTales vendor account",
};

export default function VendorLoginPage() {
  return (
    <Suspense>
      <VendorLoginForm />
    </Suspense>
  );
}
