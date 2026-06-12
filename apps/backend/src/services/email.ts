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

export const sendTeamInvitationEmail = async (
  email: string,
  inviteLink: string,
  orgName: string,
  invitedBy: string
): Promise<void> => {
  try {
    await resend.emails.send({
      from: "NexusAI <noreply@nexusai.com>",
      to: email,
      subject: `You've been invited to join ${orgName} on NexusAI`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #4f46e5; margin-bottom: 16px;">Join ${orgName} Workspace</h2>
          <p style="font-size: 14px; line-height: 1.6;">${invitedBy} has invited you to join their organization <strong>${orgName}</strong> on NexusAI to share their Pro subscription quota and collaborate.</p>
          <p style="margin: 28px 0; text-align: center;">
            <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Join Organization
            </a>
          </p>
          <p style="font-size: 12px; color: #666; line-height: 1.6;">Or copy and paste this link in your browser:</p>
          <p style="font-size: 12px; color: #4f46e5; word-break: break-all;"><a href="${inviteLink}">${inviteLink}</a></p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 11px; color: #999;">This invitation is valid for 7 days. If you did not request this invite, please ignore this email.</p>
        </div>
      `
    });
  } catch (error) {
    console.error("Failed to send team invitation email:", error);
    throw new Error("Failed to dispatch team invitation email.");
  }
};

export const sendUsageWarningEmail = async (
  email: string,
  used: number,
  limit: number
): Promise<void> => {
  const percentage = Math.round((used / limit) * 100);
  try {
    await resend.emails.send({
      from: "NexusAI <noreply@nexusai.com>",
      to: email,
      subject: `⚠️ You've used ${percentage}% of your daily AI quota — NexusAI`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #f59e0b;">⚠️ Approaching Daily Limit</h2>
          <p style="font-size: 14px; line-height: 1.6;">
            You've used <strong>${used} of ${limit} requests</strong> (${percentage}%) in your daily AI quota on NexusAI.
          </p>
          <p style="font-size: 14px; line-height: 1.6;">
            To avoid interruptions, consider upgrading your plan before your quota resets at midnight.
          </p>
          <p style="margin: 28px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/settings" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Manage Your Plan
            </a>
          </p>
          <p style="font-size: 11px; color: #999;">You can turn off these alerts in your account settings.</p>
        </div>
      `
    });
  } catch (error) {
    console.error("Failed to send usage warning email:", error);
  }
};

export const sendUsageLimitEmail = async (
  email: string,
  limit: number
): Promise<void> => {
  try {
    await resend.emails.send({
      from: "NexusAI <noreply@nexusai.com>",
      to: email,
      subject: `🚫 Daily AI quota reached — NexusAI`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px;">
          <h2 style="color: #ef4444;">🚫 Daily Limit Reached</h2>
          <p style="font-size: 14px; line-height: 1.6;">
            You've reached your daily limit of <strong>${limit} requests</strong>. Further AI requests will be blocked until midnight when your quota resets.
          </p>
          <p style="font-size: 14px; line-height: 1.6;">
            Upgrade to a higher plan to get more daily requests and uninterrupted access.
          </p>
          <p style="margin: 28px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/settings" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Upgrade Plan
            </a>
          </p>
          <p style="font-size: 11px; color: #999;">You can turn off these alerts in your account settings.</p>
        </div>
      `
    });
  } catch (error) {
    console.error("Failed to send usage limit email:", error);
  }
};
