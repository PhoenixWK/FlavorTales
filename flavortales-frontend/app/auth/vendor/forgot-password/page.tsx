import VendorForgotPasswordForm from "@/modules/auth/components/VendorForgotPasswordForm";

export const metadata = {
  title: "Forgot Password | FlavorTales",
  description: "Request a password reset code for your FlavorTales vendor account",
};

export default function VendorForgotPasswordPage() {
  return <VendorForgotPasswordForm />;
}
