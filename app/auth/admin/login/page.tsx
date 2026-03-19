import { Suspense } from "react";
import type { Metadata } from "next";
import AdminLoginForm from "@/modules/auth/components/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Sign In – FlavorTales",
};

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
