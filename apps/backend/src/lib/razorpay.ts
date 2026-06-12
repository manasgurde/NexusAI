import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_mock_key_id_123456";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "mock_key_secret_123456";

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

// Map subscription plans to Razorpay plan IDs
export const RAZORPAY_PLANS = {
  PRO_299: process.env.RAZORPAY_PLAN_STARTER_PRO || "plan_mock_starter_pro_123",
  PRO_599: process.env.RAZORPAY_PLAN_GROWTH_PRO || "plan_mock_growth_pro_123",
  PRO_999: process.env.RAZORPAY_PLAN_ELITE_PRO || "plan_mock_elite_pro_123",
};
