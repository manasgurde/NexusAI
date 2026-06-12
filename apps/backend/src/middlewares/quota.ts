import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.js";
import { db } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { SubscriptionPlan } from "@nexusai/shared";
import { sendUsageWarningEmail, sendUsageLimitEmail } from "../services/email.js";

export const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 10,
  [SubscriptionPlan.PRO_299]: 50,
  [SubscriptionPlan.PRO_599]: 120,
  [SubscriptionPlan.PRO_999]: 300,
};

export interface QuotaRequest extends AuthenticatedRequest {
  currentRequestCount?: number;
  quotaLimit?: number;
}

export const checkQuota = async (
  req: QuotaRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Authentication is required to perform this action."
    });
    return;
  }

  try {
    // 1. Fetch user's active organization membership
    const activeOrgId = (req.headers["x-organization-id"] || req.cookies?.["x-organization-id"]) as string;
    let orgId = activeOrgId || null;

    if (orgId) {
      const isMember = await db.organizationMember.findFirst({
        where: { userId, organizationId: orgId }
      });
      if (!isMember) {
        orgId = null;
      }
    }

    if (!orgId) {
      const membership = await db.organizationMember.findFirst({
        where: { userId }
      });
      orgId = membership?.organizationId || null;
    }

    // 2. Fetch active subscription plan from DB (organization level if member, otherwise fallback to user)
    let plan = SubscriptionPlan.FREE;
    let sub = null;

    if (orgId) {
      sub = await db.subscription.findFirst({
        where: {
          organizationId: orgId,
          status: "ACTIVE"
        }
      });
    } else {
      sub = await db.subscription.findFirst({
        where: {
          userId,
          status: "ACTIVE"
        }
      });
    }

    if (sub) {
      plan = sub.plan as unknown as SubscriptionPlan;
    }
    const limit = PLAN_LIMITS[plan] || PLAN_LIMITS[SubscriptionPlan.FREE];

    // 3. Count requests made today (since midnight)
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const redisKey = orgId ? `ratelimit:org:${orgId}:${todayStr}` : `ratelimit:${userId}:${todayStr}`;
    const redis = getRedis();

    let count = 0;

    if (redis) {
      count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, 86400); // 24 hours
      }
    } else {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      let dbCount = 0;
      if (orgId) {
        const members = await db.organizationMember.findMany({
          where: { organizationId: orgId },
          select: { userId: true }
        });
        const memberUserIds = members.map((m) => m.userId);
        dbCount = await db.aIHistory.count({
          where: {
            userId: { in: memberUserIds },
            createdAt: {
              gte: startOfDay
            }
          }
        });
      } else {
        dbCount = await db.aIHistory.count({
          where: {
            userId,
            createdAt: {
              gte: startOfDay
            }
          }
        });
      }
      count = dbCount + 1;
    }

    if (count > limit) {
      if (redis) {
        await redis.decr(redisKey);
      }
      res.status(429).json({
        success: false,
        message: "You have exceeded your daily request quota. Please upgrade your plan."
      });
      return;
    }

    // 4. Send threshold alert emails (non-blocking, fire-and-forget)
    const warningThreshold = Math.ceil(limit * 0.8);
    if (count === warningThreshold || count === limit) {
      // Fetch user to check usageAlerts preference and email
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, usageAlerts: true }
      });

      if (user?.email && user.usageAlerts) {
        const alertKey = `alert:${userId}:${todayStr}:${count === limit ? "100" : "80"}`;

        // Use Redis deduplication if available, otherwise send unconditionally
        let shouldSend = true;
        if (redis) {
          const alreadySent = await redis.get(alertKey);
          if (alreadySent) {
            shouldSend = false;
          } else {
            await redis.setex(alertKey, 86400, "1");
          }
        }

        if (shouldSend) {
          if (count === limit) {
            sendUsageLimitEmail(user.email, limit).catch(console.error);
          } else {
            sendUsageWarningEmail(user.email, count, limit).catch(console.error);
          }
        }
      }
    }

    req.currentRequestCount = count;
    req.quotaLimit = limit;
    next();
  } catch (error) {
    next(error);
  }
};


