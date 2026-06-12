import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@nexusai/shared";
import { db } from "../lib/db.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  // Prefer Bearer token from Authorization header
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Fallback: cookie-based token
  if (!token) {
    token = req.cookies?.access_token;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication token is missing. Access denied."
    });
    return;
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET || "default_access_secret_key_1234567890_value";
    const decoded = jwt.verify(token, secret) as { userId: string; role: UserRole };

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { isBanned: true }
    });

    if (user?.isBanned) {
      res.status(403).json({
        success: false,
        message: "Forbidden. Your account has been suspended."
      });
      return;
    }

    req.user = {
      id: decoded.userId,
      role: decoded.role
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication token is invalid or expired."
    });
  }
};

export const requireRole = (targetRole: UserRole) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized. Auth context missing."
      });
      return;
    }

    if (req.user.role !== targetRole && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        success: false,
        message: "Forbidden. Insufficient permissions."
      });
      return;
    }

    next();
  };
};
