import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth.js";
import { db } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { SubscriptionPlan, SubscriptionStatus } from "@nexusai/shared";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { PLAN_LIMITS } from "../middlewares/quota.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary from environment
cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });

const router = Router();

// 1. Get usage and quota statistics (now includes user details and organization scoping)
router.get("/usage", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    // Fetch user's active organization membership
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

    // Fetch active subscription plan from DB (organization level if member, otherwise fallback to user)
    let plan = SubscriptionPlan.FREE;
    let sub = null;

    if (orgId) {
      sub = await db.subscription.findFirst({
        where: {
          organizationId: orgId,
          status: SubscriptionStatus.ACTIVE
        }
      });
    } else {
      sub = await db.subscription.findFirst({
        where: {
          userId,
          status: SubscriptionStatus.ACTIVE
        }
      });
    }

    const planName = (sub?.plan as unknown as SubscriptionPlan) || SubscriptionPlan.FREE;
    const limit = PLAN_LIMITS[planName] || PLAN_LIMITS[SubscriptionPlan.FREE];

    // Fetch user details for profile state sync
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        role: true
      }
    });

    // Count daily requests today
    const todayStr = new Date().toISOString().split("T")[0];
    const redisKey = orgId ? `ratelimit:org:${orgId}:${todayStr}` : `ratelimit:${userId}:${todayStr}`;
    const redis = getRedis();

    let count = 0;
    if (redis) {
      const redisCount = await redis.get(redisKey);
      count = redisCount ? parseInt(redisCount, 10) : 0;
    } else {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      if (orgId) {
        const members = await db.organizationMember.findMany({
          where: { organizationId: orgId },
          select: { userId: true }
        });
        const memberUserIds = members.map((m) => m.userId);
        count = await db.aIHistory.count({
          where: {
            userId: { in: memberUserIds },
            createdAt: {
              gte: startOfDay
            }
          }
        });
      } else {
        count = await db.aIHistory.count({
          where: {
            userId,
            createdAt: {
              gte: startOfDay
            }
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        plan: planName,
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

// 4. Mock upgrade subscription
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

    const updatedSub = await db.$transaction(async (tx) => {
      // Find existing subscription
      const existingSub = orgId
        ? await tx.subscription.findFirst({ where: { organizationId: orgId } })
        : await tx.subscription.findFirst({ where: { userId } });

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
            organizationId: orgId,
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
      if (orgId) {
        // invalidate all members of the organization
        const members = await db.organizationMember.findMany({
          where: { organizationId: orgId },
          select: { userId: true }
        });
        for (const m of members) {
          const redisKey = `ratelimit:${m.userId}:${todayStr}`;
          await redis.del(redisKey);
        }
        const orgKey = `ratelimit:org:${orgId}:${todayStr}`;
        await redis.del(orgKey);
      } else {
        const redisKey = `ratelimit:${userId}:${todayStr}`;
        await redis.del(redisKey);
      }
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

// 5. GET Billing History logs for organization or user
router.get("/billing-history", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
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

    const payments = await db.payment.findMany({
      where: {
        subscription: orgId
          ? { organizationId: orgId }
          : { userId }
      },
      include: {
        subscription: {
          select: {
            plan: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve billing history"
    });
  }
});

// 6. Update notification preferences (billingAlerts, usageAlerts)
router.patch("/preferences", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  const { billingAlerts, usageAlerts } = req.body;

  try {
    const updateData: Record<string, boolean> = {};
    if (typeof billingAlerts === "boolean") updateData.billingAlerts = billingAlerts;
    if (typeof usageAlerts === "boolean") updateData.usageAlerts = usageAlerts;

    const updated = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: { billingAlerts: true, usageAlerts: true }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to update preferences" });
  }
});

// 7. GET notification preferences
router.get("/preferences", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { billingAlerts: true, usageAlerts: true }
    });

    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to load preferences" });
  }
});

// 8. GET /apikeys — list all keys for this user (masked, no hash exposed)
router.get("/apikeys", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const keys = await db.apiKey.findMany({
      where: { userId },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json({ success: true, data: keys });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to load API keys" });
  }
});

// 9. POST /apikeys — generate a new API key (returned plaintext ONCE, stored as SHA-256 hash)
router.post("/apikeys", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  const { name } = req.body;

  try {
    // Generate a cryptographically secure 64-char hex key prefixed with nexus_
    const rawKey = `nexus_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const apiKey = await db.apiKey.create({
      data: {
        userId,
        name: name?.trim() || "Default Key",
        keyHash
      },
      select: { id: true, name: true, createdAt: true }
    });

    // Return the raw key ONCE — never stored, cannot be recovered
    res.status(201).json({
      success: true,
      message: "API key generated. Copy it now — it will not be shown again.",
      data: {
        ...apiKey,
        key: rawKey
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to generate API key" });
  }
});

// 10. DELETE /apikeys/:id — revoke an API key
router.delete("/apikeys/:id", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const apiKey = await db.apiKey.findFirst({ where: { id, userId } });
    if (!apiKey) {
      res.status(404).json({ success: false, message: "API key not found" });
      return;
    }

    await db.apiKey.delete({ where: { id } });
    res.status(200).json({ success: true, message: "API key revoked successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to revoke API key" });
  }
});

// 11. DELETE /profile — hard-delete account with Cloudinary purge and org ownership check
router.delete("/profile", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    // Check if user owns organizations with other members
    const ownedMemberships = await db.organizationMember.findMany({
      where: { userId, role: "OWNER" },
      include: {
        organization: {
          include: {
            members: { select: { id: true } }
          }
        }
      }
    });

    for (const m of ownedMemberships) {
      const memberCount = m.organization.members.length;
      if (memberCount > 1) {
        res.status(400).json({
          success: false,
          message: `You own organization "${m.organization.name}" which has other members. Transfer ownership before deleting your account.`
        });
        return;
      }
    }

    // Purge Cloudinary uploaded files
    const uploadedFiles = await db.uploadedFile.findMany({
      where: { userId },
      select: { fileUrl: true }
    });

    for (const file of uploadedFiles) {
      try {
        // Extract public_id from URL (Cloudinary URL format: .../upload/v<ver>/<public_id>.<ext>)
        const urlParts = file.fileUrl.split("/upload/");
        if (urlParts.length > 1) {
          const publicIdWithExt = urlParts[1].replace(/^v\d+\//, "");
          const publicId = publicIdWithExt.replace(/\.[^.]+$/, "");
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (cloudErr) {
        console.warn(`Cloudinary deletion skipped for: ${file.fileUrl}`, cloudErr);
      }
    }

    // Hard-delete user (cascades to all related records via Prisma onDelete: Cascade)
    await db.user.delete({ where: { id: userId } });

    res.status(200).json({ success: true, message: "Account permanently deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to delete account" });
  }
});

// 12. GET /files — list all files uploaded by this user
router.get("/files", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const files = await db.uploadedFile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json({
      success: true,
      data: files
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve uploaded files"
    });
  }
});

// 13. DELETE /files/:id — delete a specific uploaded file (with Cloudinary purge and cascade db delete)
router.delete("/files/:id", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const file = await db.uploadedFile.findFirst({
      where: { id, userId }
    });

    if (!file) {
      res.status(404).json({ success: false, message: "File not found" });
      return;
    }

    // Purge from Cloudinary if applicable
    try {
      const urlParts = file.fileUrl.split("/upload/");
      if (urlParts.length > 1) {
        const publicIdWithExt = urlParts[1].replace(/^v\d+\//, "");
        const publicId = publicIdWithExt.replace(/\.[^.]+$/, "");
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (cloudErr) {
      console.warn(`Cloudinary deletion skipped for file ID ${id}: ${file.fileUrl}`, cloudErr);
    }

    // Delete from database
    await db.uploadedFile.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: "File deleted successfully"
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete file"
    });
  }
});

export default router;
