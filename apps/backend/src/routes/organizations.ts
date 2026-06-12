import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth.js";
import { db } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { sendTeamInvitationEmail } from "../services/email.js";
import jwt from "jsonwebtoken";
import { OrgRole } from "@prisma/client";

const router = Router();

// Helper to resolve active organization ID context
const getOrgId = async (req: AuthenticatedRequest): Promise<string | null> => {
  const activeOrgId = (req.headers["x-organization-id"] || req.cookies?.["x-organization-id"]) as string;
  const userId = req.user?.id;
  if (!userId) return null;

  if (activeOrgId) {
    const isMember = await db.organizationMember.findFirst({
      where: { userId, organizationId: activeOrgId }
    });
    if (isMember) return activeOrgId;
  }

  const membership = await db.organizationMember.findFirst({
    where: { userId }
  });
  return membership?.organizationId || null;
};

// 1. GET / - List all organizations the user belongs to
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  try {
    const memberships = await db.organizationMember.findMany({
      where: { userId },
      include: { organization: true }
    });
    res.status(200).json({ success: true, data: memberships.map((m) => m.organization) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch organizations" });
  }
});

// 2. GET /members - List all members in active organization context
router.get("/members", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) {
      res.status(404).json({ success: false, message: "Organization context not found." });
      return;
    }
    const members = await db.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });
    res.status(200).json({ success: true, data: members });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch members" });
  }
});

// 3. POST / - Create a new organization
router.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { name } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  if (!name || name.trim() === "") {
    res.status(400).json({ success: false, message: "Organization name is required." });
    return;
  }

  try {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`;
    const org = await db.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: { name, slug }
      });
      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: newOrg.id,
          role: OrgRole.OWNER
        }
      });
      // Create default FREE subscription for the new organization
      const nextPeriod = new Date();
      nextPeriod.setDate(nextPeriod.getDate() + 30);
      await tx.subscription.create({
        data: {
          organizationId: newOrg.id,
          plan: "FREE",
          status: "ACTIVE",
          currentPeriodEnd: nextPeriod
        }
      });
      return newOrg;
    });

    res.status(201).json({ success: true, data: org });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to create organization" });
  }
});

// 4. POST /invite - Generate invite token & dispatch email invite
router.post("/invite", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { email } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  if (!email || !email.includes("@")) {
    res.status(400).json({ success: false, message: "A valid email is required." });
    return;
  }

  try {
    const orgId = await getOrgId(req);
    if (!orgId) {
      res.status(404).json({ success: false, message: "Organization context not found." });
      return;
    }

    // Verify caller belongs to the organization
    const callerMembership = await db.organizationMember.findFirst({
      where: { userId, organizationId: orgId }
    });
    if (!callerMembership) {
      res.status(403).json({ success: false, message: "Forbidden. You are not a member of this organization." });
      return;
    }

    const org = await db.organization.findUnique({ where: { id: orgId } });
    const caller = await db.user.findUnique({ where: { id: userId } });
    if (!org || !caller) {
      res.status(404).json({ success: false, message: "Context user or organization not found." });
      return;
    }

    // Generate signed invite token (valid for 7 days)
    const secret = process.env.JWT_INVITE_SECRET || "default_invite_secret_key_123456789";
    const inviteToken = jwt.sign(
      { email, organizationId: orgId, invitedBy: caller.name || caller.email },
      secret,
      { expiresIn: "7d" }
    );

    const inviteLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/invite?token=${inviteToken}`;

    // Dispatch invitation email
    await sendTeamInvitationEmail(email, inviteLink, org.name, caller.name || caller.email || "Someone");

    res.status(200).json({
      success: true,
      message: "Invitation link generated and dispatched successfully.",
      url: inviteLink
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to dispatch invitation" });
  }
});

// 5. POST /join - Redeem invite token and join organization
router.post("/join", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { token } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  if (!token) {
    res.status(400).json({ success: false, message: "Invitation token is required." });
    return;
  }

  try {
    const secret = process.env.JWT_INVITE_SECRET || "default_invite_secret_key_123456789";
    const decoded = jwt.verify(token, secret) as { email: string; organizationId: string; invitedBy: string };

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    // Check if logged in email matches invited email
    if (user.email && user.email.toLowerCase() !== decoded.email.toLowerCase()) {
      res.status(400).json({
        success: false,
        message: `This invitation was sent to ${decoded.email}, but you are signed in as ${user.email}.`
      });
      return;
    }

    // Check if already a member
    const existingMember = await db.organizationMember.findFirst({
      where: { userId, organizationId: decoded.organizationId }
    });
    if (existingMember) {
      res.status(200).json({
        success: true,
        message: "You are already a member of this organization."
      });
      return;
    }

    // Add member
    await db.organizationMember.create({
      data: {
        userId,
        organizationId: decoded.organizationId,
        role: OrgRole.MEMBER
      }
    });

    // Invalidate Redis limits cache so active quota updates instantly
    const redis = getRedis();
    if (redis) {
      const todayStr = new Date().toISOString().split("T")[0];
      const orgKey = `ratelimit:org:${decoded.organizationId}:${todayStr}`;
      await redis.del(orgKey);

      const userKey = `ratelimit:${userId}:${todayStr}`;
      await redis.del(userKey);
    }

    res.status(200).json({
      success: true,
      message: "Successfully joined the organization!"
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.name === "TokenExpiredError" ? "Invitation has expired." : "Invalid invitation token."
    });
  }
});

export default router;
