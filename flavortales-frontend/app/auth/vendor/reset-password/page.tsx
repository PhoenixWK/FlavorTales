import { Suspense } from "react";
import VendorResetPasswordForm from "@/modules/auth/components/VendorResetPasswordForm";

export const metadata = {
  title: "Reset Password | FlavorTales",
  description: "Enter your 6-digit reset code and choose a new password",
};

export default function VendorResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FEF3EE]">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      }
    >
      <VendorResetPasswordForm />
    </Suspense>
  );
}
