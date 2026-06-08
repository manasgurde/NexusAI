import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { authConfig } from "./auth.config";

const prisma = new PrismaClient();

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const res = await fetch(
            `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/auth/login`,
            {
              method: "POST",
              body: JSON.stringify(credentials),
              headers: { "Content-Type": "application/json" }
            }
          );
          const data = await res.json();
          if (res.ok && data.success && data.data) {
            // Forward cookies from Express to the client's browser
            const setCookieHeaders = res.headers.getSetCookie();
            if (setCookieHeaders && setCookieHeaders.length > 0) {
              const cookieStore = cookies();
              for (const header of setCookieHeaders) {
                const parts = header.split(";").map((p) => p.trim());
                const [nameValue, ...attrs] = parts;
                const [cName, ...cValParts] = nameValue.split("=");
                const cVal = cValParts.join("=");
                
                const options: any = {};
                for (const attr of attrs) {
                  const [key, val] = attr.split("=");
                  const lowerKey = key.toLowerCase();
                  if (lowerKey === "httponly") options.httpOnly = true;
                  else if (lowerKey === "secure") options.secure = true;
                  else if (lowerKey === "samesite") options.sameSite = val.toLowerCase() as any;
                  else if (lowerKey === "path") options.path = val;
                  else if (lowerKey === "max-age") options.maxAge = parseInt(val, 10);
                  else if (lowerKey === "expires") options.expires = new Date(val);
                }
                cookieStore.set(cName, cVal, options);
              }
            }

            return {
              id: data.data.user.id,
              name: data.data.user.name,
              email: data.data.user.email,
              role: data.data.user.role,
              accessToken: data.data.accessToken
            };
          }
          return null;
        } catch (error) {
          console.error("NextAuth authorize error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).accessToken = token.accessToken as string;
      }
      return session;
    }
  }
});
