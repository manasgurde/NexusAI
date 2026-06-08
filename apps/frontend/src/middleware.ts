import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protect /dashboard and all subroutes
  matcher: ["/dashboard/:path*"]
};
