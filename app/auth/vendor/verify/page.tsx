import { Suspense } from "react";
import VendorVerifyEmailForm from "@/modules/auth/components/VendorVerifyEmailForm";

export const metadata = {
  title: "Verify Your Email | FlavorTales",
  description: "Enter the verification code sent to your email address",
};

export default function VendorVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FEF3EE]">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      }
    >
      <VendorVerifyEmailForm />
    </Suspense>
  );
}
