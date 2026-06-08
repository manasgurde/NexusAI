"use server";

import { signIn, signOut } from "../../auth";
import { cookies } from "next/headers";
import { AuthError } from "next-auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function registerUser(data: any) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    return result;
  } catch (error: any) {
    console.error("Registration error:", error);
    return { success: false, message: error.message || "Failed to register user." };
  }
}

export async function loginUser(data: any) {
  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false
    });
    return { success: true };
  } catch (error: any) {
    if (error instanceof AuthError) {
      return { success: false, message: "Invalid email or password." };
    }
    // NextAuth throws standard redirect errors. If it's a redirect, we return success so frontend redirects.
    if (error.message && error.message.includes("NEXT_REDIRECT")) {
      return { success: true };
    }
    console.error("Login action error:", error);
    return { success: false, message: error.message || "Invalid credentials." };
  }
}

export async function logoutUser() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (refreshToken) {
      await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `refresh_token=${refreshToken}`
        }
      });
    }

    // Clear backend cookies
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");

    // Clear NextAuth session
    await signOut({ redirectTo: "/auth" });
  } catch (error) {
    console.error("Logout action error:", error);
    await signOut({ redirectTo: "/auth" });
  }
}

export async function requestPasswordReset(email: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    return await res.json();
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return { success: false, message: error.message || "Failed to process request." };
  }
}

export async function confirmPasswordReset(data: any) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (error: any) {
    console.error("Reset password error:", error);
    return { success: false, message: error.message || "Failed to reset password." };
  }
}
