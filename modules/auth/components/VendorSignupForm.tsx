"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { vendorRegister } from "@/modules/auth/services/authApi";

interface FormData {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;
}

interface FormErrors {
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
}

export default function VendorSignupForm() {
    const router = useRouter();

    const [formData, setFormData] = useState<FormData>({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const validate = (): FormErrors => {
        const newErrors: FormErrors = {};

    if (!formData.username.trim()) {
        newErrors.username = "Username is required";
    } else if (!/^[a-zA-Z0-9]{4,32}$/.test(formData.username)) {
        newErrors.username =
            "Username must be 4–32 characters and contain only letters and numbers";
    }

    if (!formData.email.trim()) {
        newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
        newErrors.password = "Password is required";
    } else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/.test(
        formData.password
      )
    ) {
        newErrors.password =
         "Password must be at least 8 characters and include uppercase, lowercase, number and special character (@$!%*?&_-#)";
    }

    if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.phone.trim()) {
        newErrors.phone = "Phone number is required";
    } else if (!/^0\d{9,10}$/.test(formData.phone)) {
        newErrors.phone =
            "Phone must be in Vietnamese format (10–11 digits starting with 0)";
    }

        return newErrors;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
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
            const res = await vendorRegister(formData);
            setSuccessMessage(
                res.data?.message ?? "Account created! Redirecting to verification…"
            );
            setTimeout(
                () => router.replace(`/auth/vendor/verify?email=${encodeURIComponent(formData.email)}`),

                2000
            );
        } catch (err) {
            setApiError(
                err instanceof Error ? err.message : "Registration failed. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

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
                Create Vendor Account
            </h1>
            <p className="text-sm text-gray-500">
                Sign up to manage your food stall and stories
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
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition ${
                errors.username ? "border-red-400" : "border-orange-200"
              }`}
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-500">{errors.username}</p>
            )}
          </div>

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
              className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition ${
                errors.email ? "border-red-400" : "border-orange-200"
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition ${
                errors.password ? "border-red-400" : "border-orange-200"
              }`}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition ${
                errors.confirmPassword ? "border-red-400" : "border-orange-200"
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Phone number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0912 345 678"
              className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition ${
                errors.phone ? "border-red-400" : "border-orange-200"
              }`}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        {/* Sign in link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
