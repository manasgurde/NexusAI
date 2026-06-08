import { Router, Response } from "express";
import { geminiPro } from "../../lib/gemini.js";
import { requireAuth } from "../../middlewares/auth.js";
import { checkQuota, QuotaRequest } from "../../middlewares/quota.js";
import { db } from "../../lib/db.js";
import { AIToolType } from "@nexusai/shared";

const router = Router();

router.post("/", requireAuth, checkQuota, async (req: QuotaRequest, res: Response) => {
  const { code, language } = req.body;

  if (!code || typeof code !== "string" || code.trim().length === 0) {
    res.status(400).json({ success: false, message: "code is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  req.on("close", () => res.end());

  const lang = language || "auto-detect";

  const prompt = `You are an expert senior software engineer and code reviewer. Analyze the following ${lang} code and provide a thorough, structured review in Markdown format.

**Instructions:**
- Be specific — reference exact line numbers or code snippets when pointing out issues
- Be constructive — explain WHY each issue matters, not just what it is
- Provide a refactored version of the code with all issues fixed

Use EXACTLY this structure:

## 🐛 Bugs & Logic Errors
List any bugs, incorrect logic, or runtime errors. If none, write "No bugs found."

## 🔒 Security Issues
List any security vulnerabilities (SQL injection, XSS, unvalidated input, etc.). If none, write "No security issues found."

## ⚡ Performance & Optimizations
Suggest performance improvements. If none needed, write "Code looks efficient."

## ✨ Code Quality & Best Practices
Comment on readability, naming, structure, SOLID principles, etc.

## ✅ Refactored Code
\`\`\`${lang}
// Paste the complete refactored version here with all improvements applied
\`\`\`

---

**Code to review:**
\`\`\`${lang}
${code}
\`\`\``;

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
          toolId: AIToolType.CODE_REVIEW,
          prompt: `Review ${lang} code`,
          response: fullResponse,
          tokensUsed: 0
        }
      });
    }

    res.write("data: [DONE]\n\n");
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message || "Code review failed" })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
