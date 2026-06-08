import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_123456789");

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
): Promise<void> => {
  const resetLink = `${
    process.env.FRONTEND_URL || "http://localhost:3000"
  }/auth/reset?token=${resetToken}`;

  try {
    await resend.emails.send({
      from: "NexusAI <noreply@nexusai.com>",
      to: email,
      subject: "Reset your password - NexusAI",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Reset Your Password</h2>
          <p>You requested a password reset for your NexusAI account. Click the link below to set a new password:</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>This link will expire in 1 hour.</p>
        </div>
      `
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    throw new Error("Failed to dispatch password reset email.");
  }
};
