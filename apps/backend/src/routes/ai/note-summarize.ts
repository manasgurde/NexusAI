import { Router, Response } from "express";
import { geminiFlash } from "../../lib/gemini.js";
import { requireAuth } from "../../middlewares/auth.js";
import { checkQuota, QuotaRequest } from "../../middlewares/quota.js";
import { db } from "../../lib/db.js";
import { AIToolType } from "@nexusai/shared";

const router = Router();

router.post("/", requireAuth, checkQuota, async (req: QuotaRequest, res: Response) => {
  const { text } = req.body;

  if (!text || typeof text !== "string" || text.trim().length < 50) {
    res.status(400).json({ success: false, message: "text must be at least 50 characters" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  req.on("close", () => res.end());

  const prompt = `You are an expert at reading, understanding, and distilling information. Analyze the following text and produce a structured summary in Markdown format.

Use EXACTLY this structure (do not deviate or add extra sections):

## 📋 Summary
Write a clear, concise paragraph (3-5 sentences) capturing the core message and most important ideas.

## 🔑 Key Points
- List 5-8 of the most important facts, arguments, or takeaways as bullet points
- Each bullet should be one clear, standalone sentence
- Focus on actionable or memorable information

## 💡 Key Insights
- List 3-5 deeper insights, patterns, or implications that go beyond the surface content
- These should be thoughtful observations, not just restatements of facts

## ❓ Questions to Explore
- List 2-3 questions this content raises that are worth further investigation

---

**Text to analyze:**
${text}`;

  try {
    const result = await geminiFlash.generateContentStream(prompt);
    let fullResponse = "";

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullResponse += chunkText;
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    const userId = req.user?.id;
    if (userId) {
      await db.aIHistory.create({
        data: {
          userId,
          toolId: AIToolType.NOTE_SUMMARIZER,
          prompt: text.substring(0, 100) + "...",
          response: fullResponse,
          tokensUsed: 0
        }
      });
    }

    res.write("data: [DONE]\n\n");
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message || "Summarization failed" })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
