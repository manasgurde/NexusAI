import { Router, Response, Request } from "express";
import { requireAuth, AuthenticatedRequest } from "../middlewares/auth.js";
import { db } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { stripe, STRIPE_PRICES } from "../lib/stripe.js";
import { razorpay, RAZORPAY_PLANS } from "../lib/razorpay.js";
import { SubscriptionPlan, SubscriptionStatus } from "@nexusai/shared";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
import crypto from "crypto";

const router = Router();

// Centralized Helper to invalidate cache for all members of an organization
async function invalidateOrgRatelimitCache(organizationId: string) {
  try {
    const members = await db.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true }
    });

    const redis = getRedis();
    if (redis && members.length > 0) {
      const todayStr = new Date().toISOString().split("T")[0];
      for (const m of members) {
        const redisKey = `ratelimit:${m.userId}:${todayStr}`;
        await redis.del(redisKey);
      }
    }
  } catch (error) {
    console.error("Failed to invalidate ratelimit cache:", error);
  }
}

// 1. Stripe Checkout Endpoint
router.post(
  "/stripe/checkout",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { plan } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!plan || !Object.values(SubscriptionPlan).includes(plan) || plan === SubscriptionPlan.FREE) {
      res.status(400).json({ success: false, message: "Invalid subscription plan selected." });
      return;
    }

    try {
      // Find the user's active organization (first one they own or belong to)
      const membership = await db.organizationMember.findFirst({
        where: { userId },
        include: { organization: true }
      });

      if (!membership) {
        res.status(404).json({ success: false, message: "User does not belong to any organization." });
        return;
      }

      const orgId = membership.organizationId;
      const stripePriceId = STRIPE_PRICES[plan as keyof typeof STRIPE_PRICES];

      // Fallback: If using mock keys, return a simulated checkout success redirect
      if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_mock") || !process.env.STRIPE_SECRET_KEY) {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        res.status(200).json({
          success: true,
          url: `${frontendUrl}/dashboard/billing?mock_checkout_success=true&provider=stripe&plan=${plan}&orgId=${orgId}`
        });
        return;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: stripePriceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/billing?success=true`,
        cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/billing?canceled=true`,
        metadata: {
          organizationId: orgId,
          userId,
          plan,
        },
      });

      res.status(200).json({ success: true, url: session.url });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to create Stripe checkout session." });
    }
  }
);

// 2. Stripe Customer Portal Endpoint
router.post(
  "/stripe/portal",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    try {
      const membership = await db.organizationMember.findFirst({
        where: { userId }
      });

      if (!membership) {
        res.status(404).json({ success: false, message: "User does not belong to any organization." });
        return;
      }

      const subscription = await db.subscription.findFirst({
        where: {
          organizationId: membership.organizationId,
          status: SubscriptionStatus.ACTIVE,
          stripeSubscriptionId: { not: null }
        }
      });

      if (!subscription || !subscription.stripeSubscriptionId) {
        res.status(400).json({ success: false, message: "No active Stripe subscription found for this organization." });
        return;
      }

      // Fallback for mock environments
      if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_mock") || !process.env.STRIPE_SECRET_KEY) {
        res.status(200).json({
          success: true,
          url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/billing?mock_portal=true`
        });
        return;
      }

      // Retrieve subscription to fetch customer ID dynamically
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      const customerId = stripeSub.customer as string;

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/billing`,
      });

      res.status(200).json({ success: true, url: portalSession.url });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to create Stripe Customer Portal session." });
    }
  }
);

// 3. Stripe Webhook Handler (expects Raw Request body)
export const stripeWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock_stripe_webhook_secret_123456";

  if (!sig) {
    res.status(400).send("Webhook signature missing.");
    return;
  }

  let event;
  try {
    const isMock = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_mock") || !process.env.STRIPE_SECRET_KEY;
    if (isMock) {
      // Mock event construction for local testing
      const payload = typeof req.body === "string" ? JSON.parse(req.body) : JSON.parse(req.body.toString());
      event = payload;
    } else {
      // req.body must be raw buffer (handled in app.ts)
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
  } catch (err: any) {
    console.error(`Stripe Webhook Signature verification failed: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const metadata = session.metadata;

      if (metadata && metadata.organizationId && metadata.plan) {
        const organizationId = metadata.organizationId;
        const plan = metadata.plan as SubscriptionPlan;
        const userId = metadata.userId;

        const currentPeriodEnd = new Date();
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30); // 30-day renewal cycle

        // Update/create Subscription
        const sub = await db.subscription.upsert({
          where: { stripeSubscriptionId: session.subscription || `sub_mock_${Date.now()}` },
          update: {
            plan,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd,
          },
          create: {
            organizationId,
            userId,
            plan,
            status: SubscriptionStatus.ACTIVE,
            stripeSubscriptionId: session.subscription || `sub_mock_${Date.now()}`,
            currentPeriodEnd,
          }
        });

        // Log payment
        await db.payment.create({
          data: {
            subscriptionId: sub.id,
            amount: session.amount_total || 0,
            currency: (session.currency || "usd").toUpperCase(),
            provider: PaymentProvider.STRIPE,
            status: PaymentStatus.SUCCESS,
            transactionId: session.id,
          }
        });

        // Invalidate ratelimit cache
        await invalidateOrgRatelimitCache(organizationId);
      }
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any;
      const stripeSubscriptionId = subscription.id;
      const status = event.type === "customer.subscription.deleted" ? SubscriptionStatus.CANCELED : SubscriptionStatus.ACTIVE;

      await db.subscription.updateMany({
        where: { stripeSubscriptionId },
        data: {
          status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        }
      });

      // Resolve organizationId to invalidate cache
      const subRecord = await db.subscription.findUnique({
        where: { stripeSubscriptionId }
      });
      if (subRecord && subRecord.organizationId) {
        await invalidateOrgRatelimitCache(subRecord.organizationId);
      }
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error(`Stripe Webhook DB update failed: ${err.message}`);
    res.status(500).send(`DB Error: ${err.message}`);
  }
};

// 4. Razorpay Subscription Order Creation
router.post(
  "/razorpay/subscription",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { plan } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!plan || !Object.values(SubscriptionPlan).includes(plan) || plan === SubscriptionPlan.FREE) {
      res.status(400).json({ success: false, message: "Invalid subscription plan selected." });
      return;
    }

    try {
      const membership = await db.organizationMember.findFirst({
        where: { userId }
      });

      if (!membership) {
        res.status(404).json({ success: false, message: "User does not belong to any organization." });
        return;
      }

      const organizationId = membership.organizationId;
      const planId = RAZORPAY_PLANS[plan as keyof typeof RAZORPAY_PLANS];

      // Fallback for mock Razorpay configurations
      if (process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_mock") || !process.env.RAZORPAY_KEY_ID) {
        res.status(200).json({
          success: true,
          mock: true,
          keyId: "rzp_test_mock_key_id_123456",
          subscriptionId: `sub_mock_${Date.now()}`,
          plan,
          organizationId
        });
        return;
      }

      // Create a Razorpay Subscription
      const rzpSub = await razorpay.subscriptions.create({
        plan_id: planId,
        customer_notify: 1,
        total_count: 12,
        quantity: 1,
        notes: {
          organizationId,
          userId,
          plan,
        }
      });

      res.status(200).json({
        success: true,
        keyId: process.env.RAZORPAY_KEY_ID,
        subscriptionId: rzpSub.id,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to create Razorpay Subscription." });
    }
  }
);

// 5. Razorpay Signature Verification API
router.post(
  "/razorpay/verify",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan, organizationId } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    try {
      const isMock = process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_mock") || !process.env.RAZORPAY_KEY_ID;

      if (!isMock) {
        // Cryptographic HMAC SHA256 verification
        const body = razorpay_payment_id + "|" + razorpay_subscription_id;
        const expectedSignature = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
          .update(body)
          .digest("hex");

        if (expectedSignature !== razorpay_signature) {
          res.status(400).json({ success: false, message: "Invalid payment signature verification failed." });
          return;
        }
      }

      const activeOrgId = organizationId || (await db.organizationMember.findFirst({
        where: { userId }
      }))?.organizationId;

      if (!activeOrgId) {
        res.status(404).json({ success: false, message: "Organization context not found." });
        return;
      }

      const nextPeriod = new Date();
      nextPeriod.setDate(nextPeriod.getDate() + 30);

      // Define plan prices in INR paisa
      const PLAN_PRICES_INR: Record<SubscriptionPlan, number> = {
        [SubscriptionPlan.FREE]: 0,
        [SubscriptionPlan.PRO_299]: 29900,
        [SubscriptionPlan.PRO_599]: 59900,
        [SubscriptionPlan.PRO_999]: 99900,
      };

      const updatedSub = await db.$transaction(async (tx) => {
        const existingSub = await tx.subscription.findFirst({
          where: { organizationId: activeOrgId }
        });

        let sub;
        if (existingSub) {
          sub = await tx.subscription.update({
            where: { id: existingSub.id },
            data: {
              plan,
              status: SubscriptionStatus.ACTIVE,
              razorpaySubscriptionId: razorpay_subscription_id,
              currentPeriodEnd: nextPeriod,
            }
          });
        } else {
          sub = await tx.subscription.create({
            data: {
              organizationId: activeOrgId,
              userId,
              plan,
              status: SubscriptionStatus.ACTIVE,
              razorpaySubscriptionId: razorpay_subscription_id,
              currentPeriodEnd: nextPeriod,
            }
          });
        }

        // Log payment success record
        await tx.payment.create({
          data: {
            subscriptionId: sub.id,
            amount: PLAN_PRICES_INR[plan as SubscriptionPlan] || 0,
            currency: "INR",
            provider: PaymentProvider.RAZORPAY,
            status: PaymentStatus.SUCCESS,
            transactionId: razorpay_payment_id || `rzp_tx_mock_${Date.now()}`,
          }
        });

        return sub;
      });

      // Reset cache limits
      await invalidateOrgRatelimitCache(activeOrgId);

      res.status(200).json({
        success: true,
        message: "Subscription activated and verified successfully!",
        data: updatedSub
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to verify payment." });
    }
  }
);

// 6. Razorpay Webhook Handler
export const razorpayWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  const sigHeader = req.headers["x-razorpay-signature"] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "mock_razorpay_webhook_secret_123456";

  const isMock = process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_mock") || !process.env.RAZORPAY_KEY_ID;

  if (!isMock && !sigHeader) {
    res.status(400).send("Webhook signature missing.");
    return;
  }

  try {
    if (!isMock) {
      const rawBody = (req.body as Buffer).toString();
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== sigHeader) {
        res.status(400).send("Invalid webhook signature.");
        return;
      }
    }

    const payload = typeof req.body === "string" ? JSON.parse(req.body) : JSON.parse(req.body.toString());
    const event = payload.event;

    if (event === "subscription.activated" || event === "subscription.charged") {
      const rzpSub = payload.payload.subscription.entity;
      const notes = rzpSub.notes;

      if (notes && notes.organizationId) {
        const organizationId = notes.organizationId;
        const plan = notes.plan as SubscriptionPlan;
        const userId = notes.userId;

        const currentPeriodEnd = new Date((rzpSub.current_end || rzpSub.current_period_end) * 1000 || Date.now() + 30 * 24 * 60 * 60 * 1000);

        const sub = await db.subscription.upsert({
          where: { razorpaySubscriptionId: rzpSub.id },
          update: {
            plan,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd,
          },
          create: {
            organizationId,
            userId,
            plan,
            status: SubscriptionStatus.ACTIVE,
            razorpaySubscriptionId: rzpSub.id,
            currentPeriodEnd,
          }
        });

        // Log payment
        const paymentEntity = payload.payload.payment?.entity;
        await db.payment.create({
          data: {
            subscriptionId: sub.id,
            amount: paymentEntity?.amount || rzpSub.amount || 0,
            currency: (paymentEntity?.currency || "INR").toUpperCase(),
            provider: PaymentProvider.RAZORPAY,
            status: PaymentStatus.SUCCESS,
            transactionId: paymentEntity?.id || `rzp_tx_${Date.now()}`,
          }
        });

        await invalidateOrgRatelimitCache(organizationId);
      }
    } else if (event === "subscription.cancelled") {
      const rzpSub = payload.payload.subscription.entity;
      const razorpaySubscriptionId = rzpSub.id;

      await db.subscription.updateMany({
        where: { razorpaySubscriptionId },
        data: {
          status: SubscriptionStatus.CANCELED
        }
      });

      const subRecord = await db.subscription.findUnique({
        where: { razorpaySubscriptionId }
      });
      if (subRecord && subRecord.organizationId) {
        await invalidateOrgRatelimitCache(subRecord.organizationId);
      }
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error(`Razorpay Webhook parsing error: ${err.message}`);
    res.status(500).send(`Error: ${err.message}`);
  }
};

export default router;
