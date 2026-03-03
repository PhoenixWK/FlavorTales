"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { vendorLogin } from "@/modules/auth/services/authApi";
import { saveSession } from "@/shared/utils/auth";

// ── Helpers ───────────────────────────────────────────────────────────────────

function loginErrorFromStatus(status: number, fallback: string): string {
  switch (status) {
    case 400:
      return fallback; // surface validation message from server
    case 401:
      return "Invalid email or password. Please check and try again.";
    case 423:
      return "Your account is temporarily locked due to too many failed login attempts. Please try again later.";
    case 429:
      return "Too many login attempts. Please wait a moment before trying again.";
    default:
      return fallback;
  }
}

// ── Icons (inline SVG – no icon library required) ─────────────────────────────

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

// ── Form Types ────────────────────────────────────────────────────────────────

interface FormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VendorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Show "Session expired" banner when redirected back after auto-logout
  useEffect(() => {
    if (searchParams.get("reason") === "session_expired") {
      setApiError("Your session has expired. Please sign in again.");
    }
  }, [searchParams]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    return newErrors;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setApiError(null);
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await vendorLogin(formData);
      // Persist display info to localStorage for the dashboard UI
      if (res.data) {
        saveSession({
          userId: res.data.userId,
          username: res.data.username,
          email: res.data.email,
          role: res.data.role,
        });
      }
      setSuccessMessage(
        `Welcome back, ${res.data?.username ?? ""}! Redirecting…`
      );
      // Redirect based on role
      const destination =
        res.data?.role === "admin" ? "/admin/dashboard" : "/vendor/dashboard";
      // `from` param is set by middleware when the user arrives at a protected page
      const from = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("from")
        : null;
      setTimeout(() => router.replace(from ?? destination), 1500);
    } catch (err) {
      const status = (err as { status?: number }).status ?? 0;
      const fallback =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setApiError(loginErrorFromStatus(status, fallback));
    } finally {
      setIsLoading(false);
    }
  };

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
            Welcome back
          </h1>
          <p className="text-sm text-gray-500">
            Sign in to your FlavorTales vendor account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Success banner */}
          {successMessage && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 text-center">
              {successMessage}
            </div>
          )}

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
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              disabled={isLoading || !!successMessage}
              className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition disabled:opacity-60 disabled:cursor-not-allowed ${
                errors.email ? "border-red-400" : "border-orange-200"
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <Link
                href="/auth/vendor/forgot-password"
                className="text-xs text-orange-500 hover:text-orange-600 font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={isLoading || !!successMessage}
                className={`w-full px-4 py-3 pr-12 rounded-xl border bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition disabled:opacity-60 disabled:cursor-not-allowed ${
                  errors.password ? "border-red-400" : "border-orange-200"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2.5">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange}
              disabled={isLoading || !!successMessage}
              className="w-4 h-4 rounded border-orange-300 text-orange-500 accent-orange-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <label
              htmlFor="rememberMe"
              className="text-sm text-gray-600 cursor-pointer select-none"
            >
              Keep me signed in for 7 days
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !!successMessage}
            className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Sign up link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/vendor/signup"
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
