"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forgotPassword } from "@/modules/auth/services/authApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

function errorMessageFromStatus(status: number, fallback: string): string {
  switch (status) {
    case 429:
      return "Too many password reset requests. Please try again in an hour.";
    case 400:
      return fallback;
    default:
      return fallback;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VendorForgotPasswordForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    if (!email.trim()) {
      setEmailError("Email address is required");
      return false;
    }
    // Must match the backend regexp: local@domain.tld
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError(null);
    return true;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      // Always navigate to reset page - the server never reveals whether the
      // email exists, so we always proceed regardless of the outcome.
      router.push(
        `/auth/vendor/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`
      );
    } catch (err) {
      const status = (err as { status?: number }).status ?? 0;
      const fallback =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setApiError(errorMessageFromStatus(status, fallback));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEF3EE] px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-4xl shadow-sm select-none">
            🍜
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Forgot your password?
          </h1>
          <p className="text-sm text-gray-500">
            Enter your email address and we&apos;ll send you a 6-digit reset code.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* API error banner */}
          {apiError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 text-center">
              {apiError}
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
                setApiError(null);
              }}
              placeholder="name@example.com"
              disabled={isLoading}
              className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 text-sm
                placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400
                focus:border-transparent transition disabled:opacity-60 disabled:cursor-not-allowed
                ${emailError ? "border-red-400" : "border-orange-200"}`}
            />
            {emailError && (
              <p className="mt-1 text-xs text-red-500">{emailError}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700
              text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending…" : "Send reset code"}
          </button>
        </form>

        {/* Back to login */}
        <p className="text-center text-sm text-gray-500 mt-6">
          <Link
            href="/auth/vendor/login"
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
