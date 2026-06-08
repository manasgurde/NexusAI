import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@nexusai/shared";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
  };
}

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  let token: string | undefined = req.cookies?.access_token;

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
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
