import { Router, Response } from "express";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middlewares/auth.js";
import { db } from "../lib/db.js";
import { UserRole } from "@nexusai/shared";

const router = Router();

// 1. GET /users - Paginated user management query with filters
router.get(
  "/users",
  requireAuth,
  requireRole(UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const plan = req.query.plan as string;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }

    if (plan && plan !== "ALL") {
      where.memberships = {
        some: {
          organization: {
            subscriptions: {
              some: {
                plan: plan,
                status: "ACTIVE"
              }
            }
          }
        }
      };
    }

    try {
      const [users, total] = await Promise.all([
        db.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isBanned: true,
            createdAt: true,
            memberships: {
              select: {
                organization: {
                  select: {
                    name: true,
                    subscriptions: {
                      where: { status: "ACTIVE" },
                      select: { plan: true, currentPeriodEnd: true }
                    }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }),
        db.user.count({ where })
      ]);

      const formattedUsers = users.map((u) => {
        // Find active plan from first workspace
        const activeOrg = u.memberships[0]?.organization;
        const activeSub = activeOrg?.subscriptions[0];
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isBanned: u.isBanned,
          createdAt: u.createdAt,
          workspaceName: activeOrg?.name || "No Workspace",
          plan: activeSub?.plan || "FREE",
          expiresAt: activeSub?.currentPeriodEnd || null
        };
      });

      res.status(200).json({
        success: true,
        data: {
          users: formattedUsers,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to query users" });
    }
  }
);

// 2. POST /users/:id/ban - Suspend user account
router.post(
  "/users/:id/ban",
  requireAuth,
  requireRole(UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      const targetUser = await db.user.findUnique({ where: { id } });
      if (!targetUser) {
        res.status(404).json({ success: false, message: "User not found." });
        return;
      }
      if (targetUser.role === UserRole.ADMIN) {
        res.status(400).json({ success: false, message: "Administrators cannot be banned." });
        return;
      }

      await db.user.update({
        where: { id },
        data: { isBanned: true }
      });

      res.status(200).json({ success: true, message: "User account suspended successfully." });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to suspend user" });
    }
  }
);

// 3. POST /users/:id/unban - Restore user account
router.post(
  "/users/:id/unban",
  requireAuth,
  requireRole(UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      const targetUser = await db.user.findUnique({ where: { id } });
      if (!targetUser) {
        res.status(404).json({ success: false, message: "User not found." });
        return;
      }

      await db.user.update({
        where: { id },
        data: { isBanned: false }
      });

      res.status(200).json({ success: true, message: "User account restored successfully." });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to restore user" });
    }
  }
);

// 4. GET /analytics - Aggregated platform analytics
router.get(
  "/analytics",
  requireAuth,
  requireRole(UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // Aggregates for KPIs
      const [totalUsers, requestsToday, paymentRevenue, activeSubs] = await Promise.all([
        db.user.count(),
        db.aIHistory.count({ where: { createdAt: { gte: startOfDay } } }),
        db.payment.groupBy({
          by: ["currency"],
          _sum: { amount: true },
          where: {
            status: "SUCCESS",
            createdAt: { gte: thirtyDaysAgo }
          }
        }),
        db.subscription.groupBy({
          by: ["plan"],
          _count: { _all: true },
          where: { status: "ACTIVE" }
        })
      ]);

      let mrrUSD = 0;
      let mrrINR = 0;
      for (const rev of paymentRevenue) {
        const sum = rev._sum.amount || 0;
        if (rev.currency === "INR") {
          mrrINR = sum / 100;
        } else {
          mrrUSD = sum / 100;
        }
      }

      const activePlansCount = { FREE: 0, PRO_299: 0, PRO_599: 0, PRO_999: 0 };
      for (const sub of activeSubs) {
        const plan = sub.plan as keyof typeof activePlansCount;
        if (plan in activePlansCount) {
          activePlansCount[plan] = sub._count._all;
        }
      }

      // Fetch payment records of last 30 days for Revenue Chart
      const payments = await db.payment.findMany({
        where: {
          status: "SUCCESS",
          createdAt: { gte: thirtyDaysAgo }
        },
        select: {
          amount: true,
          currency: true,
          createdAt: true
        }
      });

      // Group payments by date Str YYYY-MM-DD
      const dailyRevenue: Record<string, { USD: number; INR: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        dailyRevenue[dateStr] = { USD: 0, INR: 0 };
      }

      for (const p of payments) {
        const dateStr = p.createdAt.toISOString().split("T")[0];
        if (dailyRevenue[dateStr]) {
          if (p.currency === "INR") {
            dailyRevenue[dateStr].INR += p.amount / 100;
          } else {
            dailyRevenue[dateStr].USD += p.amount / 100;
          }
        }
      }

      const revenueChartData = Object.entries(dailyRevenue).map(([date, val]) => ({
        date,
        USD: val.USD,
        INR: val.INR
      }));

      // Fetch AIHistory records of last 30 days for AI Usage Chart
      const historyLogs = await db.aIHistory.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        },
        select: {
          toolId: true,
          createdAt: true
        }
      });

      const dailyUsage: Record<string, Record<string, number>> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        dailyUsage[dateStr] = {};
      }

      for (const h of historyLogs) {
        const dateStr = h.createdAt.toISOString().split("T")[0];
        const tool = h.toolId;
        if (dailyUsage[dateStr]) {
          dailyUsage[dateStr][tool] = (dailyUsage[dateStr][tool] || 0) + 1;
        }
      }

      const usageChartData = Object.entries(dailyUsage).map(([date, tools]) => ({
        date,
        ...tools
      }));

      res.status(200).json({
        success: true,
        data: {
          kpis: {
            totalUsers,
            requestsToday,
            mrr: { USD: mrrUSD, INR: mrrINR },
            activePlans: activePlansCount
          },
          charts: {
            revenue: revenueChartData,
            usage: usageChartData
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to fetch admin metrics" });
    }
  }
);

export default router;
