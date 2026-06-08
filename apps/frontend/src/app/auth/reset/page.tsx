"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Shield, ArrowRight, ArrowLeft } from "lucide-react";
import { requestPasswordReset, confirmPasswordReset } from "../actions";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Detect if we have a token in the URL query string
  const token = searchParams.get("token");

  // View states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Flow states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  const validate = () => {
    const errors: typeof validationErrors = {};
    
    if (!token) {
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
        errors.email = "Invalid email address";
      }
    } else {
      if (password.length < 6) {
        errors.password = "Password must be at least 6 characters long";
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!validate()) return;

    setLoading(true);
    try {
      if (!token) {
        // Request Reset Link (Forgot Password)
        const res = await requestPasswordReset(email);
        if (res.success) {
          setSuccess("If the email is registered, a password reset link has been sent to it.");
        } else {
          setError(res.message || "Failed to process request.");
        }
      } else {
        // Reset Password with token
        const res = await confirmPasswordReset({ token, password, confirmPassword });
        if (res.success) {
          setSuccess("Password reset successfully. Redirecting you to login...");
          setTimeout(() => {
            router.push("/auth");
          }, 3000);
        } else {
          setError(res.message || "Failed to reset password.");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#030303]">
      {/* Animated Glowing Background Gradients */}
      <div className="absolute inset-0 z-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl"
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
            NexusAI
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {!token ? "Reset your password" : "Choose a new password"}
          </p>
        </div>

        {/* Glassmorphic Reset Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 w-full">
          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              {success}
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!token ? (
                // Request Reset Form
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2 bg-black/60 border border-gray-800 hover:border-gray-700 focus:border-accent focus:outline-none rounded-xl text-sm text-white placeholder-gray-600 transition-colors"
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="mt-1 text-xs text-destructive">
                      {validationErrors.email}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    We'll email you a secure link to reset your account password.
                  </p>
                </div>
              ) : (
                // Confirm Password Reset Form
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2 bg-black/60 border border-gray-800 hover:border-gray-700 focus:border-accent focus:outline-none rounded-xl text-sm text-white placeholder-gray-600 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-3.5 top-3 text-gray-500 hover:text-gray-400"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="mt-1 text-xs text-destructive">
                        {validationErrors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2 bg-black/60 border border-gray-800 hover:border-gray-700 focus:border-accent focus:outline-none rounded-xl text-sm text-white placeholder-gray-600 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={toggleConfirmPasswordVisibility}
                        className="absolute right-3.5 top-3 text-gray-500 hover:text-gray-400"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {validationErrors.confirmPassword && (
                      <p className="mt-1 text-xs text-destructive">
                        {validationErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-6"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {!token ? "Send Reset Link" : "Reset Password"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Back Link */}
          <div className="mt-6 text-center">
            <a
              href="/auth"
              className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen w-full flex items-center justify-center bg-[#030303]">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
