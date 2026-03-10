"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/modules/auth/services/authApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const CODE_LENGTH = 6;

// Mirrors the backend @Pattern on ResetPasswordRequest.newPassword
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/;

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

function errorMessageFromStatus(status: number, fallback: string): string {
  if (status === 400) return fallback;
  return fallback;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ── Form errors type ──────────────────────────────────────────────────────────

interface FormErrors {
  code?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VendorResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  // 6-digit OTP state
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(CODE_LENGTH).fill(null));

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const code = digits.join("");
  const isCodeComplete = code.length === CODE_LENGTH && digits.every((d) => d !== "");

  // Focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // ── OTP input handlers ────────────────────────────────────────────────────

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      setErrors((prev) => ({ ...prev, code: undefined }));
      setApiError(null);

      // Handle paste of the full 6-digit code
      if (value.length > 1) {
        const pasted = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
        if (pasted.length === 0) return;
        const next = Array(CODE_LENGTH).fill("");
        pasted.split("").forEach((ch, i) => {
          next[i] = ch;
        });
        setDigits(next);
        const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
        inputRefs.current[focusIdx]?.focus();
        return;
      }

      const digit = value.replace(/\D/g, "");
      const next = [...digits];
      next[index] = digit;
      setDigits(next);

      if (digit && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (digits[index]) {
          const next = [...digits];
          next[index] = "";
          setDigits(next);
        } else if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      }
      if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
      if (e.key === "ArrowRight" && index < CODE_LENGTH - 1)
        inputRefs.current[index + 1]?.focus();
    },
    [digits]
  );

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!isCodeComplete) {
      newErrors.code = "Please enter the complete 6-digit code";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (!PASSWORD_PATTERN.test(newPassword)) {
      newErrors.newPassword =
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&_-#)";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (newPassword && confirmPassword !== newPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      await resetPassword(code, newPassword, confirmPassword);
      setSuccessMessage(
        "Password reset successfully! Redirecting you to sign in…"
      );
      setTimeout(() => router.replace("/auth/vendor/login"), 2500);
    } catch (err) {
      const status = (err as { status?: number }).status ?? 0;
      const fallback =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setApiError(errorMessageFromStatus(status, fallback));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Missing email guard ───────────────────────────────────────────────────

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEF3EE] px-4">
        <div className="text-center space-y-3">
          <p className="text-gray-600 text-sm">Missing email address.</p>
          <Link
            href="/auth/vendor/forgot-password"
            className="text-orange-500 hover:text-orange-600 text-sm font-medium"
          >
            Request a new code
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
            Reset your password
          </h1>
          <p className="text-sm text-gray-500">
            Enter the 6-digit code sent to{" "}
            <span className="font-medium text-gray-700">{maskEmail(email)}</span>
          </p>
        </div>

        {/* Success banner */}
        {successMessage && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 text-center mb-6">
            {successMessage}
          </div>
        )}

        {/* API error banner */}
        {apiError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 text-center mb-6">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {/* 6-digit OTP boxes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Reset code
            </label>
            <div className="flex justify-center gap-2 sm:gap-3">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                  disabled={isLoading || !!successMessage}
                  aria-label={`Code digit ${i + 1}`}
                  className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-semibold rounded-xl border bg-white text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${errors.code ? "border-red-400" : "border-orange-200"}`}
                />
              ))}
            </div>
            {errors.code && (
              <p className="mt-2 text-xs text-red-500 text-center">{errors.code}</p>
            )}
          </div>

          {/* New password */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              New password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, newPassword: undefined }));
                  setApiError(null);
                }}
                placeholder="New password"
                disabled={isLoading || !!successMessage}
                className={`w-full px-4 py-3 pr-12 rounded-xl border bg-white text-gray-900 text-sm
                  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400
                  focus:border-transparent transition disabled:opacity-60 disabled:cursor-not-allowed
                  ${errors.newPassword ? "border-red-400" : "border-orange-200"}`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition"
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
              >
                {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.newPassword}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              At least 8 characters with uppercase, lowercase, number, and special character.
            </p>
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  setApiError(null);
                }}
                placeholder="Confirm new password"
                disabled={isLoading || !!successMessage}
                className={`w-full px-4 py-3 pr-12 rounded-xl border bg-white text-gray-900 text-sm
                  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400
                  focus:border-transparent transition disabled:opacity-60 disabled:cursor-not-allowed
                  ${errors.confirmPassword ? "border-red-400" : "border-orange-200"}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !!successMessage}
            className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700
              text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Resetting…" : "Reset password"}
          </button>
        </form>

        {/* Request new code link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Didn&apos;t receive a code?{" "}
          <Link
            href="/auth/vendor/forgot-password"
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            Request a new one
          </Link>
        </p>
      </div>
    </div>
  );
}
