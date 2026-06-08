import { Router, Response } from "express";
import { geminiPro } from "../../lib/gemini.js";
import { requireAuth } from "../../middlewares/auth.js";
import { checkQuota, QuotaRequest } from "../../middlewares/quota.js";
import { db } from "../../lib/db.js";
import { AIToolType } from "@nexusai/shared";

const router = Router();

const FORMAT_DESCRIPTIONS: Record<string, string> = {
  "blog-post": "a well-structured blog post with an engaging introduction, detailed body sections with subheadings, and a compelling conclusion",
  "email": "a professional email with subject line, greeting, clear body paragraphs, and a call-to-action closing",
  "tweet": "a set of 5 engaging tweets/posts (under 280 characters each) that could be posted as a thread",
  "social-caption": "an engaging social media caption with relevant emojis and 5-10 hashtags at the end",
  "marketing-copy": "persuasive marketing copy with a strong headline, value proposition, key benefits, and a clear call-to-action",
  "product-description": "a compelling product description with key features as bullet points, benefits, and a short closing paragraph",
  "linkedin-post": "a professional LinkedIn post that tells a story, shares insights, and ends with a question to spark engagement",
  "youtube-script": "a YouTube video script with hook, intro, 3 main sections with talking points, and an outro with subscribe CTA",
};

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: "formal, authoritative, and business-appropriate",
  casual: "friendly, conversational, and approachable",
  persuasive: "compelling, benefit-focused, and action-driven",
  educational: "informative, clear, and structured for learning",
  humorous: "witty, light-hearted, and entertaining",
  inspirational: "motivating, uplifting, and emotionally resonant",
};

router.post("/", requireAuth, checkQuota, async (req: QuotaRequest, res: Response) => {
  const { topic, tone, format, audience, length } = req.body;

  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    res.status(400).json({ success: false, message: "topic is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  req.on("close", () => res.end());

  const formatDesc = FORMAT_DESCRIPTIONS[format] || "high-quality written content";
  const toneDesc = TONE_DESCRIPTIONS[tone] || "professional and engaging";
  const audienceDesc = audience || "a general audience";
  const wordCount = length === "short" ? "200-300" : length === "long" ? "800-1200" : "400-600";

  const prompt = `You are a world-class content writer and copywriter. Create ${formatDesc} about the following topic.

**Topic:** ${topic}
**Tone:** ${toneDesc}
**Target Audience:** ${audienceDesc}
**Length:** Approximately ${wordCount} words

Requirements:
- Write in ${toneDesc} tone
- Optimize for the target audience: ${audienceDesc}
- Use proper Markdown formatting (headings, bold, bullet points where appropriate)
- Make it original, engaging, and valuable — not generic
- Do NOT include any meta-commentary like "Here is your content:" — start the content directly

Write the content now:`;

  try {
    const result = await geminiPro.generateContentStream(prompt);
    let fullResponse = "";

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    const userId = req.user?.id;
    if (userId) {
      await db.aIHistory.create({
        data: {
          userId,
          toolId: AIToolType.CONTENT_GEN,
          prompt: topic,
          response: fullResponse,
          tokensUsed: 0
        }
      });
    }

    res.write("data: [DONE]\n\n");
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message || "Content generation failed" })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
