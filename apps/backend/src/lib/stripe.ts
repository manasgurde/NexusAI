import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock_stripe_secret_key_1234567890_value";

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-04-10" as any, // Cast to any to bypass version type locking
});

// Map subscription plans to Stripe price IDs
// Uses environment variables or mock fallbacks for testing
export const STRIPE_PRICES = {
  PRO_299: process.env.STRIPE_PRICE_STARTER_PRO || "price_1PMockStarterPro123456",
  PRO_599: process.env.STRIPE_PRICE_GROWTH_PRO || "price_1PMockGrowthPro123456",
  PRO_999: process.env.STRIPE_PRICE_ELITE_PRO || "price_1PMockElitePro123456",
};
