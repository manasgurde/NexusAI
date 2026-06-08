import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth.js";
import { db } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { SubscriptionPlan, SubscriptionStatus } from "@nexusai/shared";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { PLAN_LIMITS } from "../middlewares/quota.js";
import bcrypt from "bcryptjs";

const router = Router();

// 1. Get usage and quota statistics (now includes user details)
router.get("/usage", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const sub = await db.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE
      }
    });

    const plan = sub?.plan || SubscriptionPlan.FREE;
    const limit = PLAN_LIMITS[plan] || PLAN_LIMITS[SubscriptionPlan.FREE];

    // Fetch user details for profile state sync
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true
      }
    });

    // Count daily requests today
    const todayStr = new Date().toISOString().split("T")[0];
    const redisKey = `ratelimit:${userId}:${todayStr}`;
    const redis = getRedis();

    let count = 0;
    if (redis) {
      const redisCount = await redis.get(redisKey);
      count = redisCount ? parseInt(redisCount, 10) : 0;
    } else {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      count = await db.aIHistory.count({
        where: {
          userId,
          createdAt: {
            gte: startOfDay
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        plan,
        requestsToday: count,
        requestLimit: limit,
        currentPeriodEnd: sub?.currentPeriodEnd || null,
        user: user || null
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve usage stats"
    });
  }
});

// 2. Update user profile details (name, avatar image, and password)
router.post("/profile", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { name, image, password } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (image !== undefined) updateData.image = image;

    if (password) {
      if (password.length < 6) {
        res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        return;
      }
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        name: true,
        email: true,
        image: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile"
    });
  }
});

// 3. Get user's AI request history log
router.get("/history", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const history = await db.aIHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30
    });

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve history log"
    });
  }
});

// 2. Mock upgrade subscription
router.post("/subscribe", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { plan } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  if (!Object.values(SubscriptionPlan).includes(plan)) {
    res.status(400).json({ success: false, message: "Invalid subscription plan selected" });
    return;
  }

  // Define prices
  const PLAN_PRICES: Record<SubscriptionPlan, number> = {
    [SubscriptionPlan.FREE]: 0,
    [SubscriptionPlan.PRO_299]: 29900, // ₹299 (in paisa)
    [SubscriptionPlan.PRO_599]: 59900, // ₹599 (in paisa)
    [SubscriptionPlan.PRO_999]: 99900, // ₹999 (in paisa)
  };

  try {
    const updatedSub = await db.$transaction(async (tx) => {
      // Find existing subscription
      const existingSub = await tx.subscription.findFirst({
        where: { userId }
      });

      const nextPeriod = new Date();
      nextPeriod.setDate(nextPeriod.getDate() + 30); // 30-day renewal cycle

      let sub;
      if (existingSub) {
        sub = await tx.subscription.update({
          where: { id: existingSub.id },
          data: {
            plan,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: nextPeriod,
          }
        });
      } else {
        sub = await tx.subscription.create({
          data: {
            userId,
            plan,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: nextPeriod,
          }
        });
      }

      // Log mock payment transaction if the plan is paid
      const amount = PLAN_PRICES[plan as SubscriptionPlan];
      if (amount > 0) {
        await tx.payment.create({
          data: {
            subscriptionId: sub.id,
            amount,
            currency: "INR",
            provider: PaymentProvider.RAZORPAY,
            status: PaymentStatus.SUCCESS,
            transactionId: `mock_tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          }
        });
      }

      return sub;
    });

    // Reset daily limits Redis key so rate limit is forced to re-sync
    const redis = getRedis();
    if (redis) {
      const todayStr = new Date().toISOString().split("T")[0];
      const redisKey = `ratelimit:${userId}:${todayStr}`;
      await redis.del(redisKey);
    }

    res.status(200).json({
      success: true,
      message: `Successfully subscribed to ${plan} plan!`,
      data: updatedSub
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update subscription"
    });
  }
});

export default router;
