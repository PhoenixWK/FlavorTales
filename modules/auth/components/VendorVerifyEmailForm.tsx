"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resendVerificationCode, verifyVendorEmail } from "@/modules/auth/services/authApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

function errorMessageFromStatus(status: number, fallback: string): string {
  switch (status) {
    case 400:
      return "Invalid verification code. Please check and try again.";
    case 409:
      return "Your account is already verified. You can sign in now.";
    case 410:
      return "Your code has expired. Please request a new one below.";
    case 404:
      return "No account found for this email address.";
    case 429:
      return "Resend limit reached. Maximum 3 resends are allowed per account.";
    default:
      return fallback;
  }
}

const MAX_RESENDS = 3;
const CODE_LENGTH = 6;

// ── Component ─────────────────────────────────────────────────────────────────

export default function VendorVerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  // 6 individual digit slots
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(CODE_LENGTH).fill(null));

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendInfo, setResendInfo] = useState<string | null>(null);
  const [resendCount, setResendCount] = useState(0);

  // Focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Derive the full code string
  const code = digits.join("");
  const isCodeComplete = code.length === CODE_LENGTH && digits.every((d) => d !== "");
  const resendsRemaining = MAX_RESENDS - resendCount;
  const resendDisabled = resendCount >= MAX_RESENDS || isResending || !!successMessage;

  // ── OTP input handlers ──────────────────────────────────────────────────────

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      setErrorMessage(null);
      setResendInfo(null);

      // Allow paste of full code
      if (value.length > 1) {
        const pasted = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
        if (pasted.length === 0) return;
        const next = Array(CODE_LENGTH).fill("");
        pasted.split("").forEach((ch, i) => {
          next[i] = ch;
        });
        setDigits(next);
        // Focus last filled or last box
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

  // ── API actions ─────────────────────────────────────────────────────────────

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCodeComplete || isVerifying) return;

    setErrorMessage(null);
    setResendInfo(null);
    setIsVerifying(true);

    try {
      await verifyVendorEmail(email, code);
      setSuccessMessage("Email verified! Redirecting to sign in…");
      setTimeout(() => router.replace("/auth/vendor/login"), 2000);
    } catch (err) {
      const status = (err as { status?: number }).status;
      const fallback =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      const msg = errorMessageFromStatus(status ?? 0, fallback);

      // If already verified, direct to login
      if (status === 409) {
        setSuccessMessage(msg + " Redirecting…");
        setTimeout(() => router.replace("/auth/vendor/login"), 2500);
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendDisabled) return;

    setErrorMessage(null);
    setResendInfo(null);
    setIsResending(true);

    try {
      await resendVerificationCode(email);
      setResendCount((c) => c + 1);
      const remaining = resendsRemaining - 1;
      setResendInfo(
        remaining > 0
          ? `A new code has been sent. ${remaining} resend${remaining !== 1 ? "s" : ""} remaining.`
          : "A new code has been sent. No more resends allowed."
      );
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err) {
      const status = (err as { status?: number }).status;
      const fallback =
        err instanceof Error ? err.message : "Failed to resend. Please try again.";
      setErrorMessage(errorMessageFromStatus(status ?? 0, fallback));
      // Sync local counter with backend limit signal
      if (status === 429) setResendCount(MAX_RESENDS);
    } finally {
      setIsResending(false);
    }
  };

  // ── Missing email guard ─────────────────────────────────────────────────────

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEF3EE] px-4">
        <div className="text-center space-y-3">
          <p className="text-gray-600 text-sm">No email address provided.</p>
          <Link
            href="/auth/vendor/signup"
            className="text-orange-500 hover:text-orange-600 text-sm font-medium"
          >
            Back to sign up
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

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
            Verify Your Email
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

        {/* Error banner */}
        {errorMessage && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 text-center mb-6">
            {errorMessage}
          </div>
        )}

        {/* Resend info banner */}
        {resendInfo && !errorMessage && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 text-center mb-6">
            {resendInfo}
          </div>
        )}

        {/* OTP form */}
        <form onSubmit={handleVerify} noValidate>
          {/* 6-digit OTP boxes */}
          <div className="flex justify-center gap-3 mb-8">
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
                disabled={!!successMessage}
                aria-label={`Digit ${i + 1}`}
                className={`w-12 h-14 text-center text-xl font-semibold rounded-xl border bg-white text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${errorMessage ? "border-red-400" : "border-orange-200"}`}
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            type="submit"
            disabled={!isCodeComplete || isVerifying || !!successMessage}
            className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700
              text-white font-semibold text-sm transition
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isVerifying ? "Verifying…" : "Verify email"}
          </button>
        </form>

        {/* Resend section */}
        <div className="mt-6 text-center text-sm text-gray-500">
          {resendDisabled && resendCount >= MAX_RESENDS ? (
            <span className="text-red-500">
              Resend limit reached. Contact support if you need help.
            </span>
          ) : (
            <>
              Didn&apos;t receive a code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendDisabled}
                className="text-orange-500 hover:text-orange-600 font-medium disabled:opacity-50
                  disabled:cursor-not-allowed transition"
              >
                {isResending
                  ? "Sending…"
                  : `Resend code${resendCount > 0 ? ` (${resendsRemaining} left)` : ""}`}
              </button>
            </>
          )}
        </div>

        {/* Back to signup */}
        <p className="text-center text-sm text-gray-500 mt-4">
          <Link
            href="/auth/vendor/signup"
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            ← Back to sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
