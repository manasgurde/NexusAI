"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Shield, ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";
import { registerUser, loginUser } from "./actions";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation inline errors
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  const validate = () => {
    const errors: typeof validationErrors = {};
    if (activeTab === "signup" && !name.trim()) {
      errors.name = "Name must be at least 2 characters long";
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Invalid email address";
    }
    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }
    if (activeTab === "signup" && password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOAuth = () => {
    setLoading(true);
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      if (activeTab === "signup") {
        const result = await registerUser({ name, email, password, confirmPassword });
        if (result.success) {
          const loginResult = await loginUser({ email, password });
          if (loginResult.success) {
            window.location.href = "/dashboard";
          } else {
            setError("Account created successfully but login failed. Please sign in.");
            setActiveTab("signin");
          }
        } else {
          setError(result.message || "Registration failed.");
        }
      } else {
        const result = await loginUser({ email, password });
        if (result.success) {
          window.location.href = "/dashboard";
        } else {
          setError(result.message || "Invalid email or password.");
        }
      }
    } catch (err: any) {
      setError(err.message || "An authentication error occurred.");
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
            One subscription. Six AI superpowers.
          </p>
        </div>

        {/* Glassmorphic Auth Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 w-full">
          {/* Google OAuth Button */}
          <button
            onClick={handleOAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-800"></div>
            <span className="mx-4 text-xs text-gray-500 uppercase tracking-widest">
              or continue with email
            </span>
            <div className="flex-grow border-t border-gray-800"></div>
          </div>

          {/* Tabs header */}
          <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-gray-800/40">
            <button
              onClick={() => {
                setActiveTab("signin");
                setValidationErrors({});
              }}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "signin"
                  ? "bg-accent text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab("signup");
                setValidationErrors({});
              }}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "signup"
                  ? "bg-accent text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Auth form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === "signup" && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-4 py-2 bg-black/60 border border-gray-800 hover:border-gray-700 focus:border-accent focus:outline-none rounded-xl text-sm text-white placeholder-gray-600 transition-colors"
                  />
                </div>
                {validationErrors.name && (
                  <p className="mt-1 text-xs text-destructive">
                    {validationErrors.name}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="email"
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
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-gray-400">
                  Password
                </label>
                {activeTab === "signin" && (
                  <a
                    href="/auth/reset"
                    className="text-xs text-accent hover:underline"
                  >
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
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

            {activeTab === "signup" && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
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
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {activeTab === "signin" ? "Sign in with Email" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
