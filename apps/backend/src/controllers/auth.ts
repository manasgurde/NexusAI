import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../lib/db.js";
import { sendPasswordResetEmail } from "../services/email.js";
import { validateRequest } from "../middlewares/validation.js";
import { SignupSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema, UserRole, OrgRole } from "@nexusai/shared";

const router = Router();

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

const generateHash = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000 // 7 days
  });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
};

// Sign Up Handler
router.post(
  "/signup",
  validateRequest(SignupSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, email, password } = req.body;

    try {
      // Check if user exists
      const existingUser = await db.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: "Email address already registered."
        });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user and default organization in transaction
      const result = await db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name,
            email,
            passwordHash,
            role: UserRole.USER
          }
        });

        const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-workspace-${crypto.randomBytes(3).toString("hex")}`;
        const newOrg = await tx.organization.create({
          data: {
            name: `${name}'s Workspace`,
            slug
          }
        });

        await tx.organizationMember.create({
          data: {
            userId: newUser.id,
            organizationId: newOrg.id,
            role: OrgRole.OWNER
          }
        });

        return { user: newUser, organization: newOrg };
      });

      res.status(201).json({
        success: true,
        message: "User account created successfully.",
        data: {
          userId: result.user.id,
          organizationId: result.organization.id
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login Handler
router.post(
  "/login",
  validateRequest(LoginSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    try {
      const user = await db.user.findUnique({
        where: { email }
      });

      if (!user || !user.passwordHash) {
        res.status(401).json({
          success: false,
          message: "Invalid email or password."
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: "Invalid email or password."
        });
        return;
      }

      // Generate access & refresh tokens
      const accessSecret = process.env.JWT_ACCESS_SECRET || "default_access_secret_key_1234567890_value";
      const refreshSecret = process.env.JWT_REFRESH_SECRET || "default_refresh_secret_key_1234567890_value";

      const accessToken = jwt.sign({ userId: user.id, role: user.role }, accessSecret, {
        expiresIn: ACCESS_TOKEN_EXPIRY
      });
      const refreshToken = jwt.sign({ userId: user.id }, refreshSecret, {
        expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`
      });

      const tokenHash = generateHash(refreshToken);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

      // Persist refresh token hash
      await db.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          deviceInfo: req.headers["user-agent"] || "unknown"
        }
      });

      setAuthCookies(res, accessToken, refreshToken);

      res.status(200).json({
        success: true,
        message: "Logged in successfully.",
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          accessToken
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Token Refresh Rotation Handler
router.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawRefreshToken = req.cookies?.refresh_token;

    if (!rawRefreshToken) {
      res.status(401).json({ success: false, message: "Refresh token is missing." });
      return;
    }

    try {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || "default_refresh_secret_key_1234567890_value";
      const decoded = jwt.verify(rawRefreshToken, refreshSecret) as { userId: string };

      const tokenHash = generateHash(rawRefreshToken);
      const activeRefreshToken = await db.refreshToken.findUnique({
        where: { tokenHash }
      });

      if (!activeRefreshToken || activeRefreshToken.revokedAt || activeRefreshToken.expiresAt < new Date()) {
        // Suspicious activity check: if token hash was already deleted/revoked, trigger global user logout
        if (activeRefreshToken && activeRefreshToken.revokedAt) {
          await db.refreshToken.deleteMany({ where: { userId: decoded.userId } });
        }
        clearAuthCookies(res);
        res.status(401).json({ success: false, message: "Refresh token is invalid or expired." });
        return;
      }

      // Generate new access & refresh tokens
      const accessSecret = process.env.JWT_ACCESS_SECRET || "default_access_secret_key_1234567890_value";
      const user = await db.user.findUnique({ where: { id: decoded.userId } });

      if (!user) {
        res.status(401).json({ success: false, message: "User context not found." });
        return;
      }

      const newAccessToken = jwt.sign({ userId: user.id, role: user.role }, accessSecret, {
        expiresIn: ACCESS_TOKEN_EXPIRY
      });
      const newRefreshToken = jwt.sign({ userId: user.id }, refreshSecret, {
        expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`
      });

      const newTokenHash = generateHash(newRefreshToken);
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

      // Invalidate current refresh token by deleting it and create a new rotated one
      await db.refreshToken.delete({ where: { id: activeRefreshToken.id } });
      await db.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
          deviceInfo: req.headers["user-agent"] || "unknown"
        }
      });

      setAuthCookies(res, newAccessToken, newRefreshToken);

      res.status(200).json({
        success: true,
        message: "Session token refreshed successfully.",
        data: {
          accessToken: newAccessToken
        }
      });
    } catch (error) {
      clearAuthCookies(res);
      res.status(401).json({ success: false, message: "Session expired." });
    }
  }
);

// Logout Handler
router.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawRefreshToken = req.cookies?.refresh_token;

    try {
      if (rawRefreshToken) {
        const tokenHash = generateHash(rawRefreshToken);
        await db.refreshToken.deleteMany({
          where: { tokenHash }
        });
      }

      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: "Logged out successfully."
      });
    } catch (error) {
      next(error);
    }
  }
);

// Request Reset Password Link
router.post(
  "/forgot-password",
  validateRequest(ForgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email } = req.body;

    try {
      const user = await db.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Silently return success to avoid email enum attacks
        res.status(200).json({
          success: true,
          message: "If the email is registered, a password reset link has been dispatched."
        });
        return;
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedResetToken = generateHash(resetToken);
      const resetTokenExpiry = new Date();
      resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiration

      // Store reset token metadata temporarily on user object
      await db.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash: hashedResetToken,
          resetTokenExpires: resetTokenExpiry
        }
      });

      // Dispatch reset email
      await sendPasswordResetEmail(email, resetToken);

      res.status(200).json({
        success: true,
        message: "If the email is registered, a password reset link has been dispatched."
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reset Password Handler
router.post(
  "/reset-password",
  validateRequest(ResetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { token, password } = req.body;

    try {
      const hashedResetToken = generateHash(token);

      // Find user with active and valid token
      const user = await db.user.findFirst({
        where: {
          resetTokenHash: hashedResetToken,
          resetTokenExpires: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        res.status(400).json({
          success: false,
          message: "Invalid or expired password reset token."
        });
        return;
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update password and clear token fields
      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetTokenHash: null,
          resetTokenExpires: null
        }
      });

      res.status(200).json({
        success: true,
        message: "Password has been reset successfully."
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
