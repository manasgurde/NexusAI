import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.js";
import { db } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { SubscriptionPlan } from "@nexusai/shared";

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
    // 1. Fetch active subscription plan from DB
    const sub = await db.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE"
      }
    });

    const plan = sub?.plan || SubscriptionPlan.FREE;
    const limit = PLAN_LIMITS[plan] || PLAN_LIMITS[SubscriptionPlan.FREE];

    // 2. Count requests made today (since midnight)
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const redisKey = `ratelimit:${userId}:${todayStr}`;
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

      const dbCount = await db.aIHistory.count({
        where: {
          userId,
          createdAt: {
            gte: startOfDay
          }
        }
      });
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

    req.currentRequestCount = count;
    req.quotaLimit = limit;
    next();
  } catch (error) {
    next(error);
  }
};
